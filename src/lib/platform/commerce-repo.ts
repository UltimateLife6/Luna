import { randomUUID } from "node:crypto";
import type { CustomizationGroup, ProductStatus, PurchaseMode } from "@/lib/catalog-store/types";
import {
  checkoutClosedHoldDetail,
  checkoutExpiresAt,
  expiredPendingOrdersStatement,
  latePaymentRecoveredDetail,
  latePaymentShortageDetail,
  reservationCountedUntil,
  sessionPaymentGraceMs,
} from "@/lib/commerce/config";
import { CommerceError } from "@/lib/commerce/errors";
import type { WebhookCommand } from "@/lib/commerce/events";
import { lineProblems, reservedQuantity, transitionFulfillment, transitionPayment, type FulfillmentStatus, type LineOffer, type PaymentStatus } from "@/lib/commerce/policy";
import { lineTotalMinor, sumMinor } from "@/lib/commerce/pricing";
import {
  adjustmentMinor,
  configurationFromSnapshot,
  parseStoredCustomization,
  pricedAdjustment,
  resolveConfiguration,
  serializeStoredCustomization,
  snapshotsEqual,
  type ConfigurationInput,
  type SelectionSnapshot,
} from "@/lib/commerce/selection";
import type { CartLine, CartView, OrderLine, PendingCheckout, ShippingRate, StoredOrder } from "@/lib/commerce/store";
import { integer, one, type Sql } from "@/lib/platform/sql";

export const variantLockSql = "SELECT id FROM variants WHERE id = ? FOR UPDATE";

type OfferRow = {
  variant_id: string;
  variant_label: string;
  sku: string;
  sku_assigned: unknown;
  currency: string;
  price_minor: unknown;
  inventory_count: unknown;
  product_id: string;
  product_name: string;
  product_slug: string;
  status: string;
  purchase_mode: string;
  made_to_order: unknown;
  made_to_order_note: string;
  customization_json: string;
};

const offerSql = `
  SELECT v.id AS variant_id, v.label AS variant_label, v.sku, v.sku_assigned, v.currency, v.price_minor, v.inventory_count,
         p.id AS product_id, p.name AS product_name, p.slug AS product_slug, p.status, p.purchase_mode,
         p.made_to_order, p.made_to_order_note, p.customization_json
  FROM variants v
  JOIN products p ON p.id = v.product_id
  WHERE v.id = ?
`;

export async function createCart(sql: Sql, now: Date): Promise<string> {
  const id = randomUUID();
  const stamp = now.toISOString();
  await sql.execute("INSERT INTO carts (id, created_at, updated_at) VALUES (?, ?, ?)", [id, stamp, stamp]);
  return id;
}

export async function addCartItem(
  sql: Sql,
  cartId: string,
  variantId: string,
  quantity: number,
  optionIdsOrConfiguration: readonly string[] | ConfigurationInput,
  now: Date,
  submittedPrice?: unknown,
): Promise<void> {
  await releaseExpiredReservations(sql, now);
  const loaded = await loadVariant(sql, variantId, now, false);
  const input = toConfiguration(optionIdsOrConfiguration);
  const snapshot = resolveConfiguration(loaded.groups, input);
  pricedAdjustment(loaded.groups, input, submittedPrice);
  const stored = serializeStoredCustomization(input, snapshot);
  const existing = await one<{ id: string; quantity: unknown }>(sql, "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND customization_json = ?", [
    cartId,
    variantId,
    stored,
  ]);
  const nextQuantity = integer(existing?.quantity ?? 0) + quantity;
  const problems = lineProblems([toOffer(loaded, nextQuantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`)]);

  if (problems.length > 0) {
    throw new CommerceError(problems);
  }

  if (existing) {
    await sql.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", [nextQuantity, existing.id]);
  } else {
    await sql.execute("INSERT INTO cart_items (id, cart_id, variant_id, quantity, customization_json) VALUES (?, ?, ?, ?, ?)", [
      randomUUID(),
      cartId,
      variantId,
      nextQuantity,
      stored,
    ]);
  }

  await sql.execute("UPDATE carts SET updated_at = ? WHERE id = ?", [now.toISOString(), cartId]);
}

export async function setCartItemQuantity(sql: Sql, cartId: string, itemId: string, quantity: number, now: Date): Promise<void> {
  await releaseExpiredReservations(sql, now);
  const item = await one<{ id: string; variant_id: string; customization_json: string }>(
    sql,
    "SELECT id, variant_id, customization_json FROM cart_items WHERE id = ? AND cart_id = ?",
    [itemId, cartId],
  );

  if (!item) {
    throw new CommerceError(["That cart item is no longer saved."]);
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    await sql.execute("DELETE FROM cart_items WHERE id = ?", [item.id]);
    return;
  }

  const loaded = await loadVariant(sql, item.variant_id, now, false);
  assertCurrentConfiguration(loaded.groups, item.customization_json);
  const problems = lineProblems([toOffer(loaded, quantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`)]);

  if (problems.length > 0) {
    throw new CommerceError(problems);
  }

  await sql.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", [quantity, item.id]);
  await sql.execute("UPDATE carts SET updated_at = ? WHERE id = ?", [now.toISOString(), cartId]);
}

export async function removeCartItem(sql: Sql, cartId: string, itemId: string): Promise<void> {
  await sql.execute("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cartId]);
}

export async function readCart(sql: Sql, cartId: string, now: Date): Promise<CartView> {
  await releaseExpiredReservations(sql, now);
  const items = await sql.query<{ id: string; variant_id: string; quantity: unknown; customization_json: string }>(
    "SELECT id, variant_id, quantity, customization_json FROM cart_items WHERE cart_id = ? ORDER BY seq",
    [cartId],
  );
  const lines: CartLine[] = [];

  for (const item of items) {
    lines.push(await toCartLine(sql, { ...item, quantity: integer(item.quantity) }, now));
  }

  return {
    id: cartId,
    lines,
    subtotalMinor: sumMinor(lines.filter((line) => line.purchasable).map((line) => line.lineTotalMinor)),
  };
}

export async function listShippingRates(sql: Sql): Promise<ShippingRate[]> {
  const rows = await sql.query<Record<string, unknown>>("SELECT id, label, amount_minor, currency, countries_json, active FROM shipping_rates ORDER BY created_at");
  return rows.map(readRate);
}

export async function activeShippingRates(sql: Sql): Promise<ShippingRate[]> {
  return (await listShippingRates(sql)).filter((rate) => rate.active);
}

export async function saveShippingRate(sql: Sql, input: { label: string; amountMinor: number; countries: string[] }, now: Date): Promise<ShippingRate> {
  const label = input.label.trim();

  if (label.length < 1 || label.length > 80) {
    throw new CommerceError(["Enter a shipping rate label of 80 characters or fewer."]);
  }

  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
    throw new CommerceError(["Enter the shipping amount as a whole number of minor units."]);
  }

  const countries = normalizeCountries(input.countries);
  const active = await activeShippingRates(sql);

  if (active.some((rate) => rate.amountMinor === input.amountMinor)) {
    throw new CommerceError(["An active shipping rate already uses that amount."]);
  }

  if (active.length >= 5) {
    throw new CommerceError(["Deactivate a shipping rate before saving another active one. Checkout accepts at most five."]);
  }

  const rate: ShippingRate = { id: randomUUID(), label, amountMinor: input.amountMinor, currency: "USD", countries, active: true };
  await sql.execute("INSERT INTO shipping_rates (id, label, amount_minor, currency, countries_json, active, created_at) VALUES (?, ?, ?, 'USD', ?, 1, ?)", [
    rate.id,
    rate.label,
    rate.amountMinor,
    JSON.stringify(rate.countries),
    now.toISOString(),
  ]);
  return rate;
}

export async function setShippingRateActive(sql: Sql, id: string, active: boolean): Promise<void> {
  if (active && (await activeShippingRates(sql)).filter((rate) => rate.id !== id).length >= 5) {
    throw new CommerceError(["Deactivate a shipping rate before turning another one on."]);
  }

  const result = await sql.execute("UPDATE shipping_rates SET active = ? WHERE id = ?", [active ? 1 : 0, id]);

  if (result.changes !== 1) {
    throw new CommerceError(["That shipping rate was not found."]);
  }
}

export async function findPendingCheckout(sql: Sql, cartId: string, now: Date): Promise<{ id: string; stripeSessionId: string | null } | null> {
  await releaseExpiredReservations(sql, now);
  const row = await one<{ id: string; stripe_session_id: string | null }>(
    sql,
    "SELECT id, stripe_session_id FROM orders WHERE cart_id = ? AND payment_status = 'pending' AND expires_at > ?",
    [cartId, now.toISOString()],
  );

  return row ? { id: row.id, stripeSessionId: row.stripe_session_id } : null;
}

export async function placePendingOrder(sql: Sql, cartId: string, now: Date): Promise<PendingCheckout> {
  await releaseExpiredReservations(sql, now);
  const preview = await readCart(sql, cartId, now);
  const unavailable = preview.lines.filter((line) => !line.purchasable);

  if (preview.lines.length === 0) {
    throw new CommerceError(["The cart is empty."]);
  }

  if (unavailable.length > 0) {
    throw new CommerceError(unavailable.map((line) => line.unavailableReason ?? `${line.productName} is unavailable.`));
  }

  const rates = await activeShippingRates(sql);

  if (rates.length < 1) {
    throw new CommerceError(["No active shipping rate is saved."]);
  }

  const expiresAt = checkoutExpiresAt(now);

  return sql.transaction(async (tx) => {
    const existing = await one(tx, "SELECT id FROM orders WHERE cart_id = ? AND payment_status = 'pending' AND expires_at > ?", [cartId, now.toISOString()]);

    if (existing) {
      throw new CommerceError(["A checkout is already pending for this cart."]);
    }

    const items = await tx.query<{ id: string; variant_id: string; quantity: unknown; customization_json: string }>(
      "SELECT id, variant_id, quantity, customization_json FROM cart_items WHERE cart_id = ? ORDER BY seq",
      [cartId],
    );
    const prepared = [];

    for (const item of items) {
      prepared.push(await prepareLine(tx, { variant_id: item.variant_id, quantity: integer(item.quantity), customization_json: item.customization_json }, now));
    }

    const problems = lineProblems(prepared.map((line) => line.offer));

    if (problems.length > 0) {
      throw new CommerceError(problems);
    }

    const orderId = randomUUID();
    const stamp = now.toISOString();
    const subtotalMinor = sumMinor(prepared.map((line) => line.lineTotalMinor));
    await tx.execute(
      `INSERT INTO orders (
         id, cart_id, payment_status, fulfillment_status, email, offered_shipping_json, currency,
         subtotal_minor, total_minor, created_at, updated_at, expires_at
       ) VALUES (?, ?, 'pending', 'unfulfilled', '', ?, 'USD', ?, ?, ?, ?, ?)`,
      [orderId, cartId, JSON.stringify(rates), subtotalMinor, subtotalMinor, stamp, stamp, expiresAt.toISOString()],
    );

    for (const line of prepared) {
      const reserve = reservedQuantity(line.offer);
      await tx.execute(
        `INSERT INTO order_lines (
           id, order_id, product_id, variant_id, product_name, variant_label, sku, unit_price_minor, quantity,
           customization_json, made_to_order, lead_time_note, reserved_quantity
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          orderId,
          line.productId,
          line.variantId,
          line.productName,
          line.variantLabel,
          line.sku,
          line.unitPriceMinor + line.adjustmentMinor,
          line.offer.quantity,
          JSON.stringify(line.selections),
          line.offer.madeToOrder ? 1 : 0,
          line.leadTimeNote,
          reserve,
        ],
      );

      if (reserve > 0) {
        await tx.execute("INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at) VALUES (?, ?, ?, ?, 'reserved', ?)", [
          randomUUID(),
          orderId,
          line.variantId,
          reserve,
          expiresAt.toISOString(),
        ]);
      }
    }

    await tx.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

    return {
      orderId,
      expiresAt,
      subtotalMinor,
      lines: prepared.map((line) => ({
        name: line.productName,
        description: [line.variantLabel, ...line.selections.map((selection) => `${selection.groupLabel}: ${selection.optionLabel}`)].filter((part) => part.length > 0).join(" · "),
        unitAmountMinor: line.unitPriceMinor + line.adjustmentMinor,
        quantity: line.offer.quantity,
      })),
      rates,
    };
  });
}

export async function attachStripeSession(sql: Sql, orderId: string, sessionId: string): Promise<void> {
  await sql.transaction(async (tx) => {
    const row = await one<{ expires_at: string }>(
      tx,
      "SELECT expires_at FROM orders WHERE id = ? AND payment_status = 'pending' AND stripe_session_id IS NULL",
      [orderId],
    );

    if (!row) {
      throw new CommerceError(["The pending order could not be attached to Checkout."]);
    }

    const result = await tx.execute("UPDATE orders SET stripe_session_id = ?, updated_at = ? WHERE id = ? AND stripe_session_id IS NULL AND payment_status = 'pending'", [
      sessionId,
      new Date().toISOString(),
      orderId,
    ]);

    if (result.changes !== 1) {
      throw new CommerceError(["The pending order could not be attached to Checkout."]);
    }

    await tx.execute("UPDATE inventory_reservations SET expires_at = ? WHERE order_id = ? AND status = 'reserved'", [
      reservationCountedUntil(new Date(row.expires_at)).toISOString(),
      orderId,
    ]);
  });
}

export async function abortPendingOrder(sql: Sql, orderId: string, now: Date): Promise<void> {
  await sql.transaction(async (tx) => {
    const order = await getOrder(tx, orderId);

    if (!order || order.paymentStatus !== "pending") {
      return;
    }

    transitionPayment(order.paymentStatus, "canceled");
    await tx.execute("UPDATE orders SET payment_status = 'canceled', fulfillment_status = 'canceled', updated_at = ? WHERE id = ? AND payment_status = 'pending'", [
      now.toISOString(),
      orderId,
    ]);
    await tx.execute("UPDATE inventory_reservations SET status = 'released' WHERE order_id = ? AND status = 'reserved'", [orderId]);
    await restoreCart(tx, order);
  });
}

export async function releaseExpiredReservations(sql: Sql, now: Date): Promise<void> {
  await sql.transaction(async (tx) => {
    const stamp = now.toISOString();
    const grace = new Date(now.getTime() - sessionPaymentGraceMs).toISOString();
    const expired = await tx.query<{ id: string }>(expiredPendingOrdersStatement(), [stamp, grace]);

    for (const order of expired) {
      await tx.execute("UPDATE inventory_reservations SET status = 'released' WHERE order_id = ? AND status = 'reserved'", [order.id]);
      await tx.execute("UPDATE orders SET payment_status = 'canceled', fulfillment_status = 'canceled', updated_at = ? WHERE id = ? AND payment_status = 'pending'", [
        stamp,
        order.id,
      ]);
    }
  });
}

export async function applyWebhookCommand(sql: Sql, command: WebhookCommand, now: Date): Promise<{ duplicate: boolean }> {
  return sql.transaction(async (tx) => {
    const inserted = await tx.execute("INSERT INTO webhook_events (id, type, processed_at) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING", [
      command.eventId,
      command.eventType,
      now.toISOString(),
    ]);

    if (inserted.changes !== 1) {
      return { duplicate: true };
    }

    if (command.kind === "paid") {
      await markPaid(tx, command, now);
    } else if (command.kind === "expired") {
      await expireOrder(tx, command.sessionId, now);
    } else {
      await markRefunded(tx, command.paymentIntentId, now);
    }

    return { duplicate: false };
  });
}

export async function orderForSession(sql: Sql, sessionId: string): Promise<StoredOrder | null> {
  const row = await one<{ id: string }>(sql, "SELECT id FROM orders WHERE stripe_session_id = ?", [sessionId]);
  return row ? getOrder(sql, row.id) : null;
}

export async function listOrders(sql: Sql): Promise<StoredOrder[]> {
  const rows = await sql.query<{ id: string }>("SELECT id FROM orders ORDER BY created_at DESC");
  const orders: StoredOrder[] = [];

  for (const row of rows) {
    const order = await getOrder(sql, row.id);

    if (order) {
      orders.push(order);
    }
  }

  return orders;
}

export async function getOrder(sql: Sql, id: string): Promise<StoredOrder | null> {
  const row = await one<Record<string, unknown>>(
    sql,
    `SELECT id, cart_id, stripe_session_id, stripe_payment_intent_id, payment_status, fulfillment_status, email,
            ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country,
            shipping_label, shipping_amount_minor, currency, subtotal_minor, total_minor, created_at, updated_at, expires_at, paid_at
     FROM orders WHERE id = ?`,
    [id],
  );

  if (!row || row.currency !== "USD") {
    return null;
  }

  const lines = await sql.query<Record<string, unknown>>(
    `SELECT id, product_id, variant_id, product_name, variant_label, sku, unit_price_minor, quantity,
            customization_json, made_to_order, lead_time_note, reserved_quantity
     FROM order_lines WHERE order_id = ? ORDER BY seq`,
    [id],
  );

  return {
    id: String(row.id),
    cartId: String(row.cart_id),
    stripeSessionId: row.stripe_session_id ? String(row.stripe_session_id) : null,
    stripePaymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    paymentStatus: String(row.payment_status) as PaymentStatus,
    fulfillmentStatus: String(row.fulfillment_status) as FulfillmentStatus,
    email: String(row.email),
    shipping: {
      name: String(row.ship_name),
      line1: String(row.ship_line1),
      line2: String(row.ship_line2),
      city: String(row.ship_city),
      region: String(row.ship_region),
      postalCode: String(row.ship_postal),
      country: String(row.ship_country),
    },
    shippingLabel: String(row.shipping_label),
    shippingAmountMinor: row.shipping_amount_minor === null || row.shipping_amount_minor === undefined ? null : integer(row.shipping_amount_minor),
    currency: "USD",
    subtotalMinor: integer(row.subtotal_minor),
    totalMinor: integer(row.total_minor),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    expiresAt: String(row.expires_at),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    lines: lines.map(readOrderLine),
  };
}

export async function updateFulfillment(sql: Sql, orderId: string, next: FulfillmentStatus, now: Date): Promise<void> {
  const order = await getOrder(sql, orderId);

  if (!order) {
    throw new CommerceError(["That order was not found."]);
  }

  try {
    transitionFulfillment(order.paymentStatus, next);
  } catch (error) {
    throw new CommerceError([error instanceof Error ? error.message : "Fulfillment was not updated."]);
  }

  await sql.execute("UPDATE orders SET fulfillment_status = ?, updated_at = ? WHERE id = ?", [next, now.toISOString(), orderId]);
}

async function markPaid(sql: Sql, command: Extract<WebhookCommand, { kind: "paid" }>, now: Date): Promise<void> {
  const row = await one<{ id: string; payment_status: PaymentStatus; subtotal_minor: unknown; offered_shipping_json: string }>(
    sql,
    "SELECT id, payment_status, subtotal_minor, offered_shipping_json FROM orders WHERE stripe_session_id = ?",
    [command.sessionId],
  );

  if (!row) {
    throw new CommerceError(["No local order matches that Checkout Session."]);
  }

  if (row.payment_status === "paid" || row.payment_status === "refunded") {
    return;
  }

  const recovering = row.payment_status === "canceled";

  if (!recovering) {
    transitionPayment(row.payment_status, "paid");
  }
  const offered = JSON.parse(row.offered_shipping_json) as ShippingRate[];
  const matches = offered.filter((rate) => rate.amountMinor === command.shippingAmountMinor && rate.currency === "USD" && rate.countries.includes(command.address.country));

  if (command.taxMinor > 0) {
    throw new CommerceError(["Stripe reported tax, and no tax rate is configured on this site."]);
  }

  if (matches.length !== 1) {
    throw new CommerceError(["The shipping amount does not match one saved rate for that country."]);
  }

  const subtotal = integer(row.subtotal_minor);
  const expectedTotal = subtotal + command.shippingAmountMinor;

  if (command.amountTotalMinor !== expectedTotal) {
    throw new CommerceError(["The charged total does not match the catalog subtotal plus the saved shipping rate."]);
  }

  const paid = await sql.execute(
    `UPDATE orders
     SET payment_status = 'paid', email = ?, ship_name = ?, ship_line1 = ?, ship_line2 = ?, ship_city = ?, ship_region = ?,
         ship_postal = ?, ship_country = ?, shipping_label = ?, shipping_amount_minor = ?, total_minor = ?,
         stripe_payment_intent_id = ?, paid_at = ?, updated_at = ?
     WHERE id = ? AND payment_status = ?`,
    [
      command.email,
      command.address.name,
      command.address.line1,
      command.address.line2,
      command.address.city,
      command.address.region,
      command.address.postalCode,
      command.address.country,
      matches[0].label,
      command.shippingAmountMinor,
      expectedTotal,
      command.paymentIntentId,
      now.toISOString(),
      now.toISOString(),
      row.id,
      row.payment_status,
    ],
  );

  if (paid.changes !== 1) {
    throw new CommerceError(["Payment confirmation did not update the pending order."]);
  }

  if (recovering) {
    await sql.execute("UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = ? AND fulfillment_status = 'canceled'", [row.id]);
  }

  const reservationStatus = recovering ? "released" : "reserved";
  const reservations = await sql.query<{ id: string; variant_id: string; quantity: unknown }>(
    "SELECT id, variant_id, quantity FROM inventory_reservations WHERE order_id = ? AND status = ?",
    [row.id, reservationStatus],
  );
  let shortage = false;

  for (const reservation of reservations) {
    const quantity = integer(reservation.quantity);
    const deducted = await sql.execute("UPDATE variants SET inventory_count = inventory_count - ? WHERE id = ? AND inventory_count >= ?", [
      quantity,
      reservation.variant_id,
      quantity,
    ]);

    if (deducted.changes !== 1) {
      if (!recovering) {
        throw new CommerceError(["Finished inventory could not be deducted for a reserved piece."]);
      }

      shortage = true;
      continue;
    }

    await sql.execute("UPDATE inventory_reservations SET status = 'committed' WHERE id = ? AND status = ?", [reservation.id, reservationStatus]);
  }

  if (recovering) {
    await sql.execute("INSERT INTO order_events (id, order_id, kind, detail, created_at) VALUES (?, ?, 'payment', ?, ?)", [
      randomUUID(),
      row.id,
      shortage ? latePaymentShortageDetail : latePaymentRecoveredDetail,
      now.toISOString(),
    ]);
  }
}

async function expireOrder(sql: Sql, sessionId: string, now: Date): Promise<void> {
  const row = await one<{ id: string; payment_status: PaymentStatus }>(sql, "SELECT id, payment_status FROM orders WHERE stripe_session_id = ?", [sessionId]);

  if (!row || row.payment_status !== "pending") {
    return;
  }

  const recorded = await one<{ id: string }>(sql, "SELECT id FROM order_events WHERE order_id = ? AND kind = 'checkout' AND detail = ?", [
    row.id,
    checkoutClosedHoldDetail,
  ]);

  if (recorded) {
    return;
  }

  await sql.execute("INSERT INTO order_events (id, order_id, kind, detail, created_at) VALUES (?, ?, 'checkout', ?, ?)", [
    randomUUID(),
    row.id,
    checkoutClosedHoldDetail,
    now.toISOString(),
  ]);
}

async function markRefunded(sql: Sql, paymentIntentId: string, now: Date): Promise<void> {
  const row = await one<{ id: string; payment_status: PaymentStatus }>(sql, "SELECT id, payment_status FROM orders WHERE stripe_payment_intent_id = ?", [paymentIntentId]);

  if (!row) {
    throw new CommerceError(["No local order matches that refund."]);
  }

  if (row.payment_status === "refunded") {
    return;
  }

  transitionPayment(row.payment_status, "refunded");
  const refunded = await sql.execute("UPDATE orders SET payment_status = 'refunded', updated_at = ? WHERE id = ? AND payment_status = 'paid'", [now.toISOString(), row.id]);

  if (refunded.changes !== 1) {
    throw new CommerceError(["The refund did not update a paid order."]);
  }
}

async function restoreCart(sql: Sql, order: StoredOrder): Promise<void> {
  for (const line of order.lines) {
    const key = serializeStoredCustomization(configurationFromSnapshot(line.selections), line.selections);
    const existing = await one<{ id: string; quantity: unknown }>(sql, "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND customization_json = ?", [
      order.cartId,
      line.variantId,
      key,
    ]);

    if (existing) {
      await sql.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", [integer(existing.quantity) + line.quantity, existing.id]);
    } else {
      await sql.execute("INSERT INTO cart_items (id, cart_id, variant_id, quantity, customization_json) VALUES (?, ?, ?, ?, ?)", [
        randomUUID(),
        order.cartId,
        line.variantId,
        line.quantity,
        key,
      ]);
    }
  }
}

async function prepareLine(sql: Sql, item: { variant_id: string; quantity: number; customization_json: string }, now: Date) {
  const loaded = await loadVariant(sql, item.variant_id, now, true);
  const selections = assertCurrentConfiguration(loaded.groups, item.customization_json);
  const offer = toOffer(loaded, item.quantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`);

  return {
    offer,
    productId: loaded.row.product_id,
    variantId: loaded.row.variant_id,
    productName: loaded.row.product_name,
    variantLabel: loaded.row.variant_label,
    sku: integer(loaded.row.sku_assigned) === 1 ? loaded.row.sku : "SKU not assigned",
    unitPriceMinor: integer(loaded.row.price_minor),
    adjustmentMinor: adjustmentMinor(selections),
    lineTotalMinor: lineTotalMinor(integer(loaded.row.price_minor), adjustmentMinor(selections), item.quantity),
    selections,
    leadTimeNote: integer(loaded.row.made_to_order) === 1 ? loaded.row.made_to_order_note.trim() : "",
  };
}

async function toCartLine(sql: Sql, item: { id: string; variant_id: string; quantity: number; customization_json: string }, now: Date): Promise<CartLine> {
  const missing: CartLine = {
    id: item.id,
    variantId: item.variant_id,
    productName: "Unavailable item",
    productSlug: "",
    variantLabel: "",
    skuLabel: "",
    quantity: item.quantity,
    unitPriceMinor: 0,
    adjustmentMinor: 0,
    lineTotalMinor: 0,
    purchasable: false,
    unavailableReason: "This item is no longer in the local catalog.",
    selections: [],
    configuration: null,
    madeToOrder: false,
    leadTimeNote: "",
  };
  const row = await one<OfferRow>(sql, offerSql, [item.variant_id]);

  if (!row) {
    return missing;
  }

  try {
    const loaded = await decorate(sql, row, now, false);
    const interpreted = interpretCartCustomization(loaded.groups, item.customization_json);
    const offer = toOffer(loaded, item.quantity, `${row.product_name} · ${row.variant_label}`);
    const problems = interpreted.matches ? lineProblems([offer]) : ["This configuration no longer matches the saved options. Remove it and add the product again."];
    const adjustment = adjustmentMinor(interpreted.selections);
    const price = integer(row.price_minor);
    const purchasable = interpreted.matches && problems.length === 0 && row.currency === "USD";

    return {
      id: item.id,
      variantId: row.variant_id,
      productName: row.product_name,
      productSlug: row.product_slug,
      variantLabel: row.variant_label,
      skuLabel: integer(row.sku_assigned) === 1 ? row.sku : "SKU not assigned",
      quantity: item.quantity,
      unitPriceMinor: price,
      adjustmentMinor: purchasable ? adjustment : 0,
      lineTotalMinor: purchasable ? lineTotalMinor(price, adjustment, item.quantity) : 0,
      purchasable,
      unavailableReason: purchasable ? null : (problems[0] ?? "This item cannot be purchased."),
      selections: interpreted.selections.map((selection) => ({ groupLabel: selection.groupLabel, optionLabel: selection.optionLabel })),
      configuration: interpreted.input,
      madeToOrder: integer(row.made_to_order) === 1,
      leadTimeNote: integer(row.made_to_order) === 1 ? row.made_to_order_note.trim() : "",
    };
  } catch (error) {
    return {
      ...missing,
      productName: row.product_name,
      productSlug: row.product_slug,
      variantLabel: row.variant_label,
      unavailableReason: error instanceof CommerceError ? error.errors[0] : "This item cannot be purchased.",
    };
  }
}

async function loadVariant(sql: Sql, variantId: string, now: Date, lock: boolean): Promise<{ row: OfferRow; groups: CustomizationGroup[]; reserved: number }> {
  if (lock && sql.dialect === "postgres") {
    await sql.execute(variantLockSql, [variantId]);
  }

  const row = await one<OfferRow>(sql, offerSql, [variantId]);

  if (!row || row.currency !== "USD" || !Number.isInteger(integer(row.price_minor))) {
    throw new CommerceError(["That variant is not available for purchase."]);
  }

  return decorate(sql, row, now, false);
}

async function decorate(sql: Sql, row: OfferRow, now: Date, lock: boolean): Promise<{ row: OfferRow; groups: CustomizationGroup[]; reserved: number }> {
  if (lock && sql.dialect === "postgres") {
    await sql.execute(variantLockSql, [row.variant_id]);
  }

  const held = await one<{ held: unknown }>(
    sql,
    "SELECT COALESCE(SUM(quantity), 0) AS held FROM inventory_reservations WHERE variant_id = ? AND status = 'reserved' AND expires_at > ?",
    [row.variant_id, now.toISOString()],
  );

  return {
    row,
    groups: JSON.parse(row.customization_json) as CustomizationGroup[],
    reserved: integer(held?.held ?? 0),
  };
}

function toOffer(loaded: { row: OfferRow; reserved: number }, quantity: number, label: string): LineOffer {
  return {
    variantId: loaded.row.variant_id,
    label,
    status: loaded.row.status as ProductStatus,
    purchaseMode: loaded.row.purchase_mode as PurchaseMode,
    madeToOrder: integer(loaded.row.made_to_order) === 1,
    inventoryCount: integer(loaded.row.inventory_count),
    reservedCount: loaded.reserved,
    quantity,
  };
}

function readRate(row: Record<string, unknown>): ShippingRate {
  if (row.currency !== "USD") {
    throw new CommerceError(["A saved shipping rate uses a currency that is not confirmed."]);
  }

  return {
    id: String(row.id),
    label: String(row.label),
    amountMinor: integer(row.amount_minor),
    currency: "USD",
    countries: JSON.parse(String(row.countries_json)) as string[],
    active: integer(row.active) === 1,
  };
}

function readOrderLine(row: Record<string, unknown>): OrderLine {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    variantId: String(row.variant_id),
    productName: String(row.product_name),
    variantLabel: String(row.variant_label),
    sku: String(row.sku),
    unitPriceMinor: integer(row.unit_price_minor),
    quantity: integer(row.quantity),
    selections: JSON.parse(String(row.customization_json)) as SelectionSnapshot[],
    madeToOrder: integer(row.made_to_order) === 1,
    leadTimeNote: String(row.lead_time_note),
    reservedQuantity: integer(row.reserved_quantity),
  };
}

function toConfiguration(value: readonly string[] | ConfigurationInput): ConfigurationInput {
  if (isConfiguration(value)) {
    return value;
  }

  return { optionIds: [...value], texts: [], measurements: [] };
}

function isConfiguration(value: readonly string[] | ConfigurationInput): value is ConfigurationInput {
  return !Array.isArray(value);
}

function assertCurrentConfiguration(groups: CustomizationGroup[], value: string): SelectionSnapshot[] {
  const interpreted = interpretCartCustomization(groups, value);

  if (!interpreted.matches) {
    throw new CommerceError(["This configuration no longer matches the saved options. Remove it and add the product again."]);
  }

  return interpreted.selections;
}

function interpretCartCustomization(groups: CustomizationGroup[], value: string): { input: ConfigurationInput; selections: SelectionSnapshot[]; matches: boolean } {
  const stored = parseStoredCustomization(value);
  const live = resolveConfiguration(groups, stored.input);

  if (!stored.snapshot) {
    return { input: stored.input, selections: live, matches: false };
  }

  return {
    input: stored.input,
    selections: snapshotsEqual(stored.snapshot, live) ? live : stored.snapshot,
    matches: snapshotsEqual(stored.snapshot, live),
  };
}

function normalizeCountries(values: string[]): string[] {
  const countries = [...new Set(values.map((code) => code.trim().toUpperCase()).filter(Boolean))];

  if (countries.length === 0 || countries.some((code) => !/^[A-Z]{2}$/.test(code))) {
    throw new CommerceError(["Enter one or more two-letter country codes."]);
  }

  return countries;
}
