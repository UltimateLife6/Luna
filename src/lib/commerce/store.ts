import { randomUUID } from "node:crypto";
import type { DatabaseSync, SqlValue } from "node:sqlite";
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
import type { ShippingAddress, WebhookCommand } from "@/lib/commerce/events";
import {
  lineProblems,
  reservedQuantity,
  transitionFulfillment,
  transitionPayment,
  type FulfillmentStatus,
  type LineOffer,
  type PaymentStatus,
} from "@/lib/commerce/policy";
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

export type ShippingRate = {
  id: string;
  label: string;
  amountMinor: number;
  currency: "USD";
  countries: string[];
  active: boolean;
};

export type CartLine = {
  id: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  skuLabel: string;
  quantity: number;
  unitPriceMinor: number;
  adjustmentMinor: number;
  lineTotalMinor: number;
  purchasable: boolean;
  unavailableReason: string | null;
  selections: { groupLabel: string; optionLabel: string }[];
  configuration: ConfigurationInput | null;
  madeToOrder: boolean;
  leadTimeNote: string;
};

export type CartView = {
  id: string;
  lines: CartLine[];
  subtotalMinor: number;
};

export type OrderLine = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPriceMinor: number;
  quantity: number;
  selections: SelectionSnapshot[];
  madeToOrder: boolean;
  leadTimeNote: string;
  reservedQuantity: number;
};

export type StoredOrder = {
  id: string;
  cartId: string;
  stripeSessionId: string | null;
  stripePaymentIntentId: string | null;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  email: string;
  shipping: ShippingAddress;
  shippingLabel: string;
  shippingAmountMinor: number | null;
  currency: "USD";
  subtotalMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  paidAt: string | null;
  lines: OrderLine[];
};

export type PendingCheckout = {
  orderId: string;
  expiresAt: Date;
  subtotalMinor: number;
  lines: {
    name: string;
    description: string;
    unitAmountMinor: number;
    quantity: number;
  }[];
  rates: ShippingRate[];
};

type OfferRow = {
  variant_id: string;
  variant_label: string;
  sku: string;
  sku_assigned: number;
  currency: string;
  price_minor: number;
  inventory_count: number;
  product_id: string;
  product_name: string;
  product_slug: string;
  status: string;
  purchase_mode: string;
  made_to_order: number;
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

export function createCart(database: DatabaseSync, now: Date): string {
  const id = randomUUID();
  const stamp = now.toISOString();
  database.prepare("INSERT INTO carts (id, created_at, updated_at) VALUES (?, ?, ?)").run(id, stamp, stamp);
  return id;
}

export function addCartItem(
  database: DatabaseSync,
  cartId: string,
  variantId: string,
  quantity: number,
  optionIdsOrConfiguration: readonly string[] | ConfigurationInput,
  now: Date,
  submittedPrice?: unknown,
): void {
  releaseExpiredReservations(database, now);
  const loaded = loadVariant(database, variantId, now);
  const input = toConfiguration(optionIdsOrConfiguration);
  const snapshot = resolveConfiguration(loaded.groups, input);
  pricedAdjustment(loaded.groups, input, submittedPrice);
  const stored = serializeStoredCustomization(input, snapshot);
  const existing = database
    .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND customization_json = ?")
    .get(cartId, variantId, stored) as { id: string; quantity: number } | undefined;
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  const problems = lineProblems([toOffer(loaded, nextQuantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`)]);

  if (problems.length > 0) {
    throw new CommerceError(problems);
  }

  if (existing) {
    database.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(nextQuantity, existing.id);
  } else {
    database
      .prepare("INSERT INTO cart_items (id, cart_id, variant_id, quantity, customization_json) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), cartId, variantId, nextQuantity, stored);
  }

  database.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(now.toISOString(), cartId);
}

export function setCartItemQuantity(database: DatabaseSync, cartId: string, itemId: string, quantity: number, now: Date): void {
  releaseExpiredReservations(database, now);
  const item = database.prepare("SELECT id, variant_id, customization_json FROM cart_items WHERE id = ? AND cart_id = ?").get(itemId, cartId) as
    | { id: string; variant_id: string; customization_json: string }
    | undefined;

  if (!item) {
    throw new CommerceError(["That cart item is no longer saved."]);
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    database.prepare("DELETE FROM cart_items WHERE id = ?").run(item.id);
    return;
  }

  const loaded = loadVariant(database, item.variant_id, now);
  assertCurrentConfiguration(loaded.groups, item.customization_json);
  const problems = lineProblems([toOffer(loaded, quantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`)]);

  if (problems.length > 0) {
    throw new CommerceError(problems);
  }

  database.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(quantity, item.id);
  database.prepare("UPDATE carts SET updated_at = ? WHERE id = ?").run(now.toISOString(), cartId);
}

export function removeCartItem(database: DatabaseSync, cartId: string, itemId: string): void {
  database.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(itemId, cartId);
}

export function readCart(database: DatabaseSync, cartId: string, now: Date): CartView {
  releaseExpiredReservations(database, now);
  const items = database
    .prepare("SELECT id, variant_id, quantity, customization_json FROM cart_items WHERE cart_id = ? ORDER BY rowid")
    .all(cartId) as unknown as { id: string; variant_id: string; quantity: number; customization_json: string }[];

  const lines = items.map((item) => toCartLine(database, item, now));

  return {
    id: cartId,
    lines,
    subtotalMinor: sumMinor(lines.filter((line) => line.purchasable).map((line) => line.lineTotalMinor)),
  };
}

export function listShippingRates(database: DatabaseSync): ShippingRate[] {
  return (
    database.prepare("SELECT id, label, amount_minor, currency, countries_json, active FROM shipping_rates ORDER BY created_at").all() as unknown as {
      id: string;
      label: string;
      amount_minor: number;
      currency: string;
      countries_json: string;
      active: number;
    }[]
  ).map(readRate);
}

export function activeShippingRates(database: DatabaseSync): ShippingRate[] {
  return listShippingRates(database).filter((rate) => rate.active);
}

export function saveShippingRate(
  database: DatabaseSync,
  input: { label: string; amountMinor: number; countries: string[] },
  now: Date,
): ShippingRate {
  const label = input.label.trim();

  if (label.length < 1 || label.length > 80) {
    throw new CommerceError(["Enter a shipping rate label of 80 characters or fewer."]);
  }

  if (!Number.isInteger(input.amountMinor) || input.amountMinor < 0) {
    throw new CommerceError(["Enter the shipping amount as a whole number of minor units."]);
  }

  const countries = normalizeCountries(input.countries);
  const active = activeShippingRates(database);
  const activeCount = active.length;

  if (active.some((rate) => rate.amountMinor === input.amountMinor)) {
    throw new CommerceError(["An active shipping rate already uses that amount."]);
  }

  if (activeCount >= 5) {
    throw new CommerceError(["Deactivate a shipping rate before saving another active one. Checkout accepts at most five."]);
  }

  const rate: ShippingRate = {
    id: randomUUID(),
    label,
    amountMinor: input.amountMinor,
    currency: "USD",
    countries,
    active: true,
  };

  database
    .prepare(
      `INSERT INTO shipping_rates (id, label, amount_minor, currency, countries_json, active, created_at)
       VALUES (?, ?, ?, 'USD', ?, 1, ?)`,
    )
    .run(rate.id, rate.label, rate.amountMinor, JSON.stringify(rate.countries), now.toISOString());

  return rate;
}

export function setShippingRateActive(database: DatabaseSync, id: string, active: boolean): void {
  if (active && activeShippingRates(database).filter((rate) => rate.id !== id).length >= 5) {
    throw new CommerceError(["Deactivate a shipping rate before turning another one on."]);
  }

  const result = database.prepare("UPDATE shipping_rates SET active = ? WHERE id = ?").run(active ? 1 : 0, id);

  if (result.changes !== 1) {
    throw new CommerceError(["That shipping rate was not found."]);
  }
}

export function findPendingCheckout(
  database: DatabaseSync,
  cartId: string,
  now: Date,
): { id: string; stripeSessionId: string | null } | null {
  releaseExpiredReservations(database, now);
  const row = database
    .prepare(
      `SELECT id, stripe_session_id FROM orders
       WHERE cart_id = ? AND payment_status = 'pending' AND expires_at > ?`,
    )
    .get(cartId, now.toISOString()) as { id: string; stripe_session_id: string | null } | undefined;

  return row ? { id: row.id, stripeSessionId: row.stripe_session_id } : null;
}

export function placePendingOrder(database: DatabaseSync, cartId: string, now: Date): PendingCheckout {
  releaseExpiredReservations(database, now);
  const preview = readCart(database, cartId, now);
  const unavailable = preview.lines.filter((line) => !line.purchasable);

  if (preview.lines.length === 0) {
    throw new CommerceError(["The cart is empty."]);
  }

  if (unavailable.length > 0) {
    throw new CommerceError(unavailable.map((line) => line.unavailableReason ?? `${line.productName} is unavailable.`));
  }

  const rates = activeShippingRates(database);

  if (rates.length < 1) {
    throw new CommerceError(["No active shipping rate is saved."]);
  }

  const expiresAt = checkoutExpiresAt(now);

  return withImmediate(database, () => {
    const existing = database
      .prepare("SELECT id FROM orders WHERE cart_id = ? AND payment_status = 'pending' AND expires_at > ?")
      .get(cartId, now.toISOString());

    if (existing) {
      throw new CommerceError(["A checkout is already pending for this cart."]);
    }

    const items = database
      .prepare("SELECT id, variant_id, quantity, customization_json FROM cart_items WHERE cart_id = ? ORDER BY rowid")
      .all(cartId) as unknown as { id: string; variant_id: string; quantity: number; customization_json: string }[];
    const prepared = items.map((item) => prepareLine(database, item, now));
    const problems = lineProblems(prepared.map((line) => line.offer));

    if (problems.length > 0) {
      throw new CommerceError(problems);
    }

    const orderId = randomUUID();
    const stamp = now.toISOString();
    const subtotalMinor = sumMinor(prepared.map((line) => line.lineTotalMinor));

    database
      .prepare(
        `INSERT INTO orders (
           id, cart_id, payment_status, fulfillment_status, email, offered_shipping_json, currency,
           subtotal_minor, total_minor, created_at, updated_at, expires_at
         ) VALUES (?, ?, 'pending', 'unfulfilled', '', ?, 'USD', ?, ?, ?, ?, ?)`,
      )
      .run(orderId, cartId, JSON.stringify(rates), subtotalMinor, subtotalMinor, stamp, stamp, expiresAt.toISOString());

    const insertLine = database.prepare(
      `INSERT INTO order_lines (
         id, order_id, product_id, variant_id, product_name, variant_label, sku, unit_price_minor, quantity,
         customization_json, made_to_order, lead_time_note, reserved_quantity
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertReservation = database.prepare(
      `INSERT INTO inventory_reservations (id, order_id, variant_id, quantity, status, expires_at)
       VALUES (?, ?, ?, ?, 'reserved', ?)`,
    );

    for (const line of prepared) {
      const reserve = reservedQuantity(line.offer);
      insertLine.run(
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
      );

      if (reserve > 0) {
        insertReservation.run(randomUUID(), orderId, line.variantId, reserve, expiresAt.toISOString());
      }
    }

    database.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cartId);

    return {
      orderId,
      expiresAt,
      subtotalMinor,
      lines: prepared.map((line) => ({
        name: line.productName,
        description: [line.variantLabel, ...line.selections.map((selection) => `${selection.groupLabel}: ${selection.optionLabel}`)]
          .filter((part) => part.length > 0)
          .join(" · "),
        unitAmountMinor: line.unitPriceMinor + line.adjustmentMinor,
        quantity: line.offer.quantity,
      })),
      rates,
    };
  });
}

export function attachStripeSession(database: DatabaseSync, orderId: string, sessionId: string): void {
  withImmediate(database, () => {
    const row = database.prepare("SELECT expires_at FROM orders WHERE id = ? AND payment_status = 'pending' AND stripe_session_id IS NULL").get(orderId) as
      | { expires_at: string }
      | undefined;

    if (!row) {
      throw new CommerceError(["The pending order could not be attached to Checkout."]);
    }

    const result = database
      .prepare("UPDATE orders SET stripe_session_id = ?, updated_at = ? WHERE id = ? AND stripe_session_id IS NULL AND payment_status = 'pending'")
      .run(sessionId, new Date().toISOString(), orderId);

    if (result.changes !== 1) {
      throw new CommerceError(["The pending order could not be attached to Checkout."]);
    }

    database
      .prepare("UPDATE inventory_reservations SET expires_at = ? WHERE order_id = ? AND status = 'reserved'")
      .run(reservationCountedUntil(new Date(row.expires_at)).toISOString(), orderId);
  });
}

export function abortPendingOrder(database: DatabaseSync, orderId: string, now: Date): void {
  withImmediate(database, () => {
    const order = getOrder(database, orderId);

    if (!order || order.paymentStatus !== "pending") {
      return;
    }

    transitionPayment(order.paymentStatus, "canceled");
    database
      .prepare("UPDATE orders SET payment_status = 'canceled', fulfillment_status = 'canceled', updated_at = ? WHERE id = ? AND payment_status = 'pending'")
      .run(now.toISOString(), orderId);
    database.prepare("UPDATE inventory_reservations SET status = 'released' WHERE order_id = ? AND status = 'reserved'").run(orderId);
    restoreCart(database, order);
  });
}

export function releaseExpiredReservations(database: DatabaseSync, now: Date): void {
  withImmediate(database, () => {
    const stamp = now.toISOString();
    const grace = new Date(now.getTime() - sessionPaymentGraceMs).toISOString();
    const expired = database.prepare(expiredPendingOrdersStatement()).all(stamp, grace) as unknown as { id: string }[];

    for (const order of expired) {
      database.prepare("UPDATE inventory_reservations SET status = 'released' WHERE order_id = ? AND status = 'reserved'").run(order.id);
      database
        .prepare(
          "UPDATE orders SET payment_status = 'canceled', fulfillment_status = 'canceled', updated_at = ? WHERE id = ? AND payment_status = 'pending'",
        )
        .run(stamp, order.id);
    }
  });
}

export function applyWebhookCommand(database: DatabaseSync, command: WebhookCommand, now: Date): { duplicate: boolean } {
  return withImmediate(database, () => {
    const inserted = database
      .prepare("INSERT INTO webhook_events (id, type, processed_at) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING")
      .run(command.eventId, command.eventType, now.toISOString());

    if (inserted.changes !== 1) {
      return { duplicate: true };
    }

    if (command.kind === "paid") {
      markPaid(database, command, now);
    } else if (command.kind === "expired") {
      expireOrder(database, command.sessionId, now);
    } else {
      markRefunded(database, command.paymentIntentId, now);
    }

    return { duplicate: false };
  });
}

export function orderForSession(database: DatabaseSync, sessionId: string): StoredOrder | null {
  const row = database.prepare("SELECT id FROM orders WHERE stripe_session_id = ?").get(sessionId) as { id: string } | undefined;
  return row ? getOrder(database, row.id) : null;
}

export function listOrders(database: DatabaseSync): StoredOrder[] {
  const rows = database.prepare("SELECT id FROM orders ORDER BY created_at DESC").all() as unknown as { id: string }[];
  return rows.flatMap((row) => {
    const order = getOrder(database, row.id);
    return order ? [order] : [];
  });
}

export function getOrder(database: DatabaseSync, id: string): StoredOrder | null {
  const row = database
    .prepare(
      `SELECT id, cart_id, stripe_session_id, stripe_payment_intent_id, payment_status, fulfillment_status, email,
              ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country,
              shipping_label, shipping_amount_minor, currency, subtotal_minor, total_minor, created_at, updated_at, expires_at, paid_at
       FROM orders WHERE id = ?`,
    )
    .get(id) as Record<string, SqlValue> | undefined;

  if (!row || row.currency !== "USD") {
    return null;
  }

  const lines = (
    database
      .prepare(
        `SELECT id, product_id, variant_id, product_name, variant_label, sku, unit_price_minor, quantity,
                customization_json, made_to_order, lead_time_note, reserved_quantity
         FROM order_lines WHERE order_id = ? ORDER BY rowid`,
      )
      .all(id) as unknown as Record<string, SqlValue>[]
  ).map(readOrderLine);

  return {
    id: String(row.id),
    cartId: String(row.cart_id),
    stripeSessionId: row.stripe_session_id ? String(row.stripe_session_id) : null,
    stripePaymentIntentId: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    paymentStatus: row.payment_status as PaymentStatus,
    fulfillmentStatus: row.fulfillment_status as FulfillmentStatus,
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
    shippingAmountMinor: typeof row.shipping_amount_minor === "number" ? row.shipping_amount_minor : null,
    currency: "USD",
    subtotalMinor: Number(row.subtotal_minor),
    totalMinor: Number(row.total_minor),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    expiresAt: String(row.expires_at),
    paidAt: row.paid_at ? String(row.paid_at) : null,
    lines,
  };
}

export function updateFulfillment(database: DatabaseSync, orderId: string, next: FulfillmentStatus, now: Date): void {
  const order = getOrder(database, orderId);

  if (!order) {
    throw new CommerceError(["That order was not found."]);
  }

  try {
    transitionFulfillment(order.paymentStatus, next);
  } catch (error) {
    throw new CommerceError([error instanceof Error ? error.message : "Fulfillment was not updated."]);
  }

  database.prepare("UPDATE orders SET fulfillment_status = ?, updated_at = ? WHERE id = ?").run(next, now.toISOString(), orderId);
}

export function parseCountryList(input: string): string[] {
  return normalizeCountries(input.split(/[\s,]+/));
}

function markPaid(database: DatabaseSync, command: Extract<WebhookCommand, { kind: "paid" }>, now: Date): void {
  const row = database.prepare("SELECT id, payment_status, subtotal_minor, offered_shipping_json FROM orders WHERE stripe_session_id = ?").get(command.sessionId) as
    | { id: string; payment_status: PaymentStatus; subtotal_minor: number; offered_shipping_json: string }
    | undefined;

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

  const expectedTotal = row.subtotal_minor + command.shippingAmountMinor;

  if (command.amountTotalMinor !== expectedTotal) {
    throw new CommerceError(["The charged total does not match the catalog subtotal plus the saved shipping rate."]);
  }

  const paid = database
    .prepare(
      `UPDATE orders
       SET payment_status = 'paid', email = ?, ship_name = ?, ship_line1 = ?, ship_line2 = ?, ship_city = ?, ship_region = ?,
           ship_postal = ?, ship_country = ?, shipping_label = ?, shipping_amount_minor = ?, total_minor = ?,
           stripe_payment_intent_id = ?, paid_at = ?, updated_at = ?
       WHERE id = ? AND payment_status = ?`,
    )
    .run(
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
    );

  if (paid.changes !== 1) {
    throw new CommerceError(["Payment confirmation did not update the pending order."]);
  }

  if (recovering) {
    database.prepare("UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = ? AND fulfillment_status = 'canceled'").run(row.id);
  }

  const reservationStatus = recovering ? "released" : "reserved";
  const reservations = database
    .prepare("SELECT id, variant_id, quantity FROM inventory_reservations WHERE order_id = ? AND status = ?")
    .all(row.id, reservationStatus) as unknown as { id: string; variant_id: string; quantity: number }[];
  let shortage = false;

  for (const reservation of reservations) {
    const deducted = database
      .prepare("UPDATE variants SET inventory_count = inventory_count - ? WHERE id = ? AND inventory_count >= ?")
      .run(reservation.quantity, reservation.variant_id, reservation.quantity);

    if (deducted.changes !== 1) {
      if (!recovering) {
        throw new CommerceError(["Finished inventory could not be deducted for a reserved piece."]);
      }

      shortage = true;
      continue;
    }

    database.prepare("UPDATE inventory_reservations SET status = 'committed' WHERE id = ? AND status = ?").run(reservation.id, reservationStatus);
  }

  if (recovering) {
    database
      .prepare("INSERT INTO order_events (id, order_id, kind, detail, created_at) VALUES (?, ?, 'payment', ?, ?)")
      .run(
        randomUUID(),
        row.id,
        shortage ? latePaymentShortageDetail : latePaymentRecoveredDetail,
        now.toISOString(),
      );
  }
}

function expireOrder(database: DatabaseSync, sessionId: string, now: Date): void {
  const row = database.prepare("SELECT id, payment_status FROM orders WHERE stripe_session_id = ?").get(sessionId) as
    | { id: string; payment_status: PaymentStatus }
    | undefined;

  if (!row || row.payment_status !== "pending") {
    return;
  }

  const recorded = database
    .prepare("SELECT id FROM order_events WHERE order_id = ? AND kind = 'checkout' AND detail = ?")
    .get(row.id, checkoutClosedHoldDetail) as { id: string } | undefined;

  if (recorded) {
    return;
  }

  database
    .prepare("INSERT INTO order_events (id, order_id, kind, detail, created_at) VALUES (?, ?, 'checkout', ?, ?)")
    .run(randomUUID(), row.id, checkoutClosedHoldDetail, now.toISOString());
}

function markRefunded(database: DatabaseSync, paymentIntentId: string, now: Date): void {
  const row = database.prepare("SELECT id, payment_status FROM orders WHERE stripe_payment_intent_id = ?").get(paymentIntentId) as
    | { id: string; payment_status: PaymentStatus }
    | undefined;

  if (!row) {
    throw new CommerceError(["No local order matches that refund."]);
  }

  if (row.payment_status === "refunded") {
    return;
  }

  transitionPayment(row.payment_status, "refunded");
  const refunded = database
    .prepare("UPDATE orders SET payment_status = 'refunded', updated_at = ? WHERE id = ? AND payment_status = 'paid'")
    .run(now.toISOString(), row.id);

  if (refunded.changes !== 1) {
    throw new CommerceError(["The refund did not update a paid order."]);
  }
}

function restoreCart(database: DatabaseSync, order: StoredOrder): void {
  for (const line of order.lines) {
    const key = serializeStoredCustomization(configurationFromSnapshot(line.selections), line.selections);
    const existing = database
      .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? AND customization_json = ?")
      .get(order.cartId, line.variantId, key) as { id: string; quantity: number } | undefined;

    if (existing) {
      database.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(existing.quantity + line.quantity, existing.id);
    } else {
      database
        .prepare("INSERT INTO cart_items (id, cart_id, variant_id, quantity, customization_json) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), order.cartId, line.variantId, line.quantity, key);
    }
  }
}

function prepareLine(
  database: DatabaseSync,
  item: { variant_id: string; quantity: number; customization_json: string },
  now: Date,
): {
  offer: LineOffer;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPriceMinor: number;
  adjustmentMinor: number;
  lineTotalMinor: number;
  selections: SelectionSnapshot[];
  leadTimeNote: string;
} {
  const loaded = loadVariant(database, item.variant_id, now);
  const selections = assertCurrentConfiguration(loaded.groups, item.customization_json);
  const offer = toOffer(loaded, item.quantity, `${loaded.row.product_name} · ${loaded.row.variant_label}`);

  return {
    offer,
    productId: loaded.row.product_id,
    variantId: loaded.row.variant_id,
    productName: loaded.row.product_name,
    variantLabel: loaded.row.variant_label,
    sku: loaded.row.sku_assigned === 1 ? loaded.row.sku : "SKU not assigned",
    unitPriceMinor: loaded.row.price_minor,
    adjustmentMinor: adjustmentMinor(selections),
    lineTotalMinor: lineTotalMinor(loaded.row.price_minor, adjustmentMinor(selections), item.quantity),
    selections,
    leadTimeNote: loaded.row.made_to_order === 1 ? loaded.row.made_to_order_note.trim() : "",
  };
}

function toCartLine(
  database: DatabaseSync,
  item: { id: string; variant_id: string; quantity: number; customization_json: string },
  now: Date,
): CartLine {
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

  const row = database.prepare(offerSql).get(item.variant_id) as OfferRow | undefined;

  if (!row) {
    return missing;
  }

  try {
    const loaded = decorate(database, row, now);
    const interpreted = interpretCartCustomization(loaded.groups, item.customization_json);
    const selections = interpreted.selections;
    const offer = toOffer(loaded, item.quantity, `${row.product_name} · ${row.variant_label}`);
    const problems = interpreted.matches ? lineProblems([offer]) : ["This configuration no longer matches the saved options. Remove it and add the product again."];
    const adjustment = adjustmentMinor(selections);
    const purchasable = interpreted.matches && problems.length === 0 && row.currency === "USD";

    return {
      id: item.id,
      variantId: row.variant_id,
      productName: row.product_name,
      productSlug: row.product_slug,
      variantLabel: row.variant_label,
      skuLabel: row.sku_assigned === 1 ? row.sku : "SKU not assigned",
      quantity: item.quantity,
      unitPriceMinor: row.price_minor,
      adjustmentMinor: purchasable ? adjustment : 0,
      lineTotalMinor: purchasable ? lineTotalMinor(row.price_minor, adjustment, item.quantity) : 0,
      purchasable,
      unavailableReason: purchasable ? null : problems[0] ?? "This item cannot be purchased.",
      selections: selections.map((selection) => ({ groupLabel: selection.groupLabel, optionLabel: selection.optionLabel })),
      configuration: interpreted.input,
      madeToOrder: row.made_to_order === 1,
      leadTimeNote: row.made_to_order === 1 ? row.made_to_order_note.trim() : "",
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

function loadVariant(database: DatabaseSync, variantId: string, now: Date): { row: OfferRow; groups: CustomizationGroup[]; reserved: number } {
  const row = database.prepare(offerSql).get(variantId) as OfferRow | undefined;

  if (!row || row.currency !== "USD" || !Number.isInteger(row.price_minor)) {
    throw new CommerceError(["That variant is not available for purchase."]);
  }

  return decorate(database, row, now);
}

function decorate(database: DatabaseSync, row: OfferRow, now: Date): { row: OfferRow; groups: CustomizationGroup[]; reserved: number } {
  const held = database
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS held FROM inventory_reservations
       WHERE variant_id = ? AND status = 'reserved' AND expires_at > ?`,
    )
    .get(row.variant_id, now.toISOString()) as { held: number } | undefined;

  return {
    row,
    groups: JSON.parse(row.customization_json) as CustomizationGroup[],
    reserved: Number(held?.held ?? 0),
  };
}

function toOffer(loaded: { row: OfferRow; reserved: number }, quantity: number, label: string): LineOffer {
  return {
    variantId: loaded.row.variant_id,
    label,
    status: loaded.row.status as ProductStatus,
    purchaseMode: loaded.row.purchase_mode as PurchaseMode,
    madeToOrder: loaded.row.made_to_order === 1,
    inventoryCount: loaded.row.inventory_count,
    reservedCount: loaded.reserved,
    quantity,
  };
}

function readRate(row: { id: string; label: string; amount_minor: number; currency: string; countries_json: string; active: number }): ShippingRate {
  if (row.currency !== "USD") {
    throw new CommerceError(["A saved shipping rate uses a currency that is not confirmed."]);
  }

  return {
    id: row.id,
    label: row.label,
    amountMinor: row.amount_minor,
    currency: "USD",
    countries: JSON.parse(row.countries_json) as string[],
    active: row.active === 1,
  };
}

function readOrderLine(row: Record<string, SqlValue>): OrderLine {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    variantId: String(row.variant_id),
    productName: String(row.product_name),
    variantLabel: String(row.variant_label),
    sku: String(row.sku),
    unitPriceMinor: Number(row.unit_price_minor),
    quantity: Number(row.quantity),
    selections: JSON.parse(String(row.customization_json)) as SelectionSnapshot[],
    madeToOrder: row.made_to_order === 1,
    leadTimeNote: String(row.lead_time_note),
    reservedQuantity: Number(row.reserved_quantity),
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

function interpretCartCustomization(
  groups: CustomizationGroup[],
  value: string,
): { input: ConfigurationInput; selections: SelectionSnapshot[]; matches: boolean } {
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

function withImmediate<T>(database: DatabaseSync, fn: () => T): T {
  database.exec("BEGIN IMMEDIATE");

  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
