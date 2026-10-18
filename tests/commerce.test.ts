import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import Stripe from "stripe";
import type { DatabaseSync } from "node:sqlite";
import { openCatalogDatabase } from "@/lib/catalog-store/db";
import { listCategories, saveCatalogProduct } from "@/lib/catalog-store/products";
import type { ProductInput } from "@/lib/catalog-store/types";
import { checkoutBlockers, checkoutExpiresAt, holdMs, sessionPaymentGraceMs, stripeCheckoutMaxMs, stripeCheckoutMinMs } from "@/lib/commerce/config";
import { CommerceError } from "@/lib/commerce/errors";
import { commandFromStripeEvent, type WebhookCommand } from "@/lib/commerce/events";
import { lineProblems, transitionFulfillment, transitionPayment } from "@/lib/commerce/policy";
import { lineTotalMinor } from "@/lib/commerce/pricing";
import { buildCheckoutSessionParams } from "@/lib/commerce/session";
import { verifyWebhook } from "@/lib/commerce/stripe";
import {
  addCartItem,
  applyWebhookCommand,
  attachStripeSession,
  createCart,
  getOrder,
  orderForSession,
  placePendingOrder,
  readCart,
  releaseExpiredReservations,
  saveShippingRate,
  updateFulfillment,
} from "@/lib/commerce/store";

const now = new Date("2026-10-18T15:00:00.000Z");
let sequence = 0;

function withDatabase(run: (database: DatabaseSync) => void): void {
  const database = openCatalogDatabase(":memory:");

  try {
    run(database);
  } finally {
    database.close();
  }
}

function sell(
  database: DatabaseSync,
  overrides: Partial<ProductInput> & { inventoryCount?: number; priceMinor?: number } = {},
): { variantId: string } {
  sequence += 1;
  const { inventoryCount, priceMinor, variants, ...productOverrides } = overrides;
  const input: ProductInput = {
    name: `Test piece ${sequence}`,
    slug: `test-piece-${sequence}`,
    summary: "A local catalog record created for a commerce test.",
    description: "This description exists only inside the test database.",
    categoryId: listCategories(database)[0].id,
    status: "published",
    madeToOrder: false,
    madeToOrderNote: "",
    purchaseMode: "checkout",
    customizationGroups: [],
    images: [],
    ...productOverrides,
    variants: variants ?? [
      {
        label: "One size",
        sku: `TEST-${sequence}`,
        currency: "USD",
        priceMinor: priceMinor ?? 12500,
        inventoryCount: inventoryCount ?? 2,
      },
    ],
  };
  const product = saveCatalogProduct(database, input, []);

  return { variantId: product.variants[0].id };
}

function rate(database: DatabaseSync): void {
  saveShippingRate(database, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
}

function inventory(database: DatabaseSync, variantId: string): number {
  const row = database.prepare("SELECT inventory_count FROM variants WHERE id = ?").get(variantId) as { inventory_count: number };
  return row.inventory_count;
}

function paidCommand(sessionId: string, subtotalMinor: number, shippingAmountMinor = 800): Extract<WebhookCommand, { kind: "paid" }> {
  return {
    kind: "paid",
    eventId: `evt_${sessionId}`,
    eventType: "checkout.session.completed",
    sessionId,
    paymentIntentId: `pi_${sessionId}`,
    email: "guest@example.test",
    shippingAmountMinor,
    taxMinor: 0,
    amountTotalMinor: subtotalMinor + shippingAmountMinor,
    address: {
      name: "Test Guest",
      line1: "1 Test Street",
      line2: "",
      city: "Test City",
      region: "TS",
      postalCode: "00000",
      country: "US",
    },
  };
}

describe("commerce pricing and policy", () => {
  it("calculates a cart line from catalog minor units", () => {
    assert.equal(lineTotalMinor(12500, 0, 2), 25000);
    assert.equal(lineTotalMinor(12500, 500, 2), 26000);
    assert.throws(() => lineTotalMinor(12.5, 0, 1), CommerceError);
  });

  it("blocks checkout without test keys or a saved shipping rate", () => {
    assert.ok(checkoutBlockers({ secretKey: undefined, webhookSecret: undefined, shippingRates: [] }).length >= 3);
    assert.match(checkoutBlockers({ secretKey: "sk_live_example", webhookSecret: "whsec_example", shippingRates: [{ countries: ["US"] }] }).join(" "), /Live payments/);
    assert.deepEqual(
      checkoutBlockers({ secretKey: "sk_test_example", webhookSecret: "whsec_example", shippingRates: [{ countries: ["US"] }] }),
      [],
    );
  });

  it("rejects unpublished, quote-only, and over-inventory lines", () => {
    const base = {
      variantId: "variant-1",
      label: "Test piece",
      status: "published" as const,
      purchaseMode: "checkout" as const,
      madeToOrder: false,
      inventoryCount: 2,
      reservedCount: 1,
      quantity: 2,
    };

    assert.match(lineProblems([base]).join(" "), /1 finished piece/);
    assert.match(lineProblems([{ ...base, quantity: 1, status: "draft" }]).join(" "), /not available/);
    assert.match(lineProblems([{ ...base, quantity: 1, purchaseMode: "quote-only" }]).join(" "), /quote-only/);
    assert.deepEqual(lineProblems([{ ...base, quantity: 1, madeToOrder: true, inventoryCount: 0, reservedCount: 0 }]), []);
  });

  it("keeps payment and fulfillment transitions separate", () => {
    assert.equal(transitionPayment("pending", "paid"), "paid");
    assert.equal(transitionPayment("paid", "refunded"), "refunded");
    assert.throws(() => transitionPayment("pending", "refunded"));
    assert.throws(() => transitionFulfillment("pending", "processing"));
    assert.equal(transitionFulfillment("paid", "processing"), "processing");
  });
});

describe("commerce checkout", () => {
  it("prices the cart from the catalog and ignores a stored client price", () => {
    withDatabase((database) => {
      const { variantId } = sell(database);
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 2, [], now);
      database.prepare("UPDATE variants SET price_minor = 5000 WHERE id = ?").run(variantId);
      const cart = readCart(database, cartId, now);
      const columns = database.prepare("PRAGMA table_info(cart_items)").all() as { name: string }[];

      assert.equal(cart.lines[0].unitPriceMinor, 5000);
      assert.equal(cart.subtotalMinor, 10000);
      assert.equal(columns.some((column) => column.name.includes("price")), false);
    });
  });

  it("refuses quote-only, draft, and archived products", () => {
    withDatabase((database) => {
      const cartId = createCart(database, now);
      const quote = sell(database, { purchaseMode: "quote-only" });
      const draft = sell(database, { status: "draft", slug: "draft-piece", name: "Draft piece" });
      const archived = sell(database, { status: "archived", slug: "archived-piece", name: "Archived piece" });

      assert.throws(() => addCartItem(database, cartId, quote.variantId, 1, [], now), CommerceError);
      assert.throws(() => addCartItem(database, cartId, draft.variantId, 1, [], now), CommerceError);
      assert.throws(() => addCartItem(database, cartId, archived.variantId, 1, [], now), CommerceError);
    });
  });

  it("enforces finished inventory and keeps made-to-order pieces outside that limit", () => {
    withDatabase((database) => {
      const stocked = sell(database, { inventoryCount: 2 });
      const made = sell(database, {
        madeToOrder: true,
        madeToOrderNote: "Fourteen days, entered by the test.",
        inventoryCount: 0,
        slug: "made-piece",
        name: "Made piece",
      });
      const cartId = createCart(database, now);

      assert.throws(() => addCartItem(database, cartId, stocked.variantId, 3, [], now), CommerceError);
      addCartItem(database, cartId, made.variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      const order = getOrder(database, pending.orderId);

      assert.equal(order?.lines[0].leadTimeNote, "Fourteen days, entered by the test.");
      assert.equal(order?.lines[0].reservedQuantity, 0);
      assert.equal(order?.lines[0].madeToOrder, true);
      assert.equal(inventory(database, made.variantId), 0);
      assert.equal(
        Number((database.prepare("SELECT COUNT(*) AS count FROM inventory_reservations").get() as { count: number }).count),
        0,
      );
    });
  });

  it("stores customization selections and their saved adjustment", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "group-test",
            label: "Test group",
            options: [
              { id: "option-a", label: "Option A", priceAdjustmentMinor: 500 },
              { id: "option-b", label: "Option B", priceAdjustmentMinor: 0 },
            ],
          },
        ],
      });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 2, ["option-a"], now);
      const cart = readCart(database, cartId, now);

      assert.equal(cart.subtotalMinor, 26000);
      assert.equal(cart.lines[0].selections[0].optionLabel, "Option A");
    });
  });

  it("reserves the last finished piece once and releases it after expiry", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 1 });
      const firstCart = createCart(database, now);
      const secondCart = createCart(database, now);
      addCartItem(database, firstCart, variantId, 1, [], now);
      addCartItem(database, secondCart, variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, firstCart, now);

      assert.throws(() => placePendingOrder(database, secondCart, now), CommerceError);
      assert.equal(inventory(database, variantId), 1);

      database.prepare("UPDATE orders SET expires_at = ? WHERE id = ?").run("2026-10-18T14:00:00.000Z", pending.orderId);
      releaseExpiredReservations(database, now);
      const expired = getOrder(database, pending.orderId);

      assert.equal(expired?.paymentStatus, "canceled");
      assert.equal(expired?.fulfillmentStatus, "canceled");
      assert.equal(inventory(database, variantId), 1);
      assert.equal(placePendingOrder(database, secondCart, now).orderId.length > 0, true);
    });
  });

  it("accepts a paid webhook after the hold while the Checkout session is still inside the payment grace", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 1, priceMinor: 10000 });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      attachStripeSession(database, pending.orderId, "cs_grace");
      database.prepare("UPDATE orders SET expires_at = ? WHERE id = ?").run(new Date(now.getTime() - 60_000).toISOString(), pending.orderId);
      releaseExpiredReservations(database, now);

      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "pending");
      applyWebhookCommand(database, paidCommand("cs_grace", pending.subtotalMinor), now);
      applyWebhookCommand(database, { ...paidCommand("cs_grace", pending.subtotalMinor), eventId: "evt_cs_grace_again" }, now);

      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "paid");
      assert.equal(inventory(database, variantId), 0);
    });
  });

  it("keeps the last piece reserved after Checkout expiry until the payment retry window ends", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 1, priceMinor: 10000 });
      const cartId = createCart(database, now);
      const otherCart = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, [], now);
      addCartItem(database, otherCart, variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      attachStripeSession(database, pending.orderId, "cs_hold");
      const duringRetry = new Date(now.getTime() + 32 * 60 * 1000);

      assert.throws(() => placePendingOrder(database, otherCart, duringRetry), CommerceError);
      applyWebhookCommand(
        database,
        { kind: "expired", eventId: "evt_hold_expired", eventType: "checkout.session.expired", sessionId: "cs_hold" },
        duringRetry,
      );

      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "pending");
      assert.throws(() => placePendingOrder(database, otherCart, duringRetry), CommerceError);
      applyWebhookCommand(database, { ...paidCommand("cs_hold", pending.subtotalMinor), eventId: "evt_hold_paid" }, duringRetry);

      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "paid");
      assert.equal(inventory(database, variantId), 0);
    });
  });

  it("records a verified payment after the grace releases the hold without driving inventory negative", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 1, priceMinor: 10000 });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      attachStripeSession(database, pending.orderId, "cs_late");
      database.prepare("UPDATE orders SET expires_at = ? WHERE id = ?").run(new Date(now.getTime() - sessionPaymentGraceMs - 60_000).toISOString(), pending.orderId);
      releaseExpiredReservations(database, now);
      database.prepare("UPDATE variants SET inventory_count = 0 WHERE id = ?").run(variantId);

      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "canceled");
      applyWebhookCommand(database, paidCommand("cs_late", pending.subtotalMinor), now);
      const recovered = getOrder(database, pending.orderId);
      const event = database.prepare("SELECT detail FROM order_events WHERE order_id = ?").get(pending.orderId) as { detail: string };

      assert.equal(recovered?.paymentStatus, "paid");
      assert.equal(recovered?.fulfillmentStatus, "unfulfilled");
      assert.equal(inventory(database, variantId), 0);
      assert.match(event.detail, /could not be deducted/);
    });
  });

  it("does not let a second connection reserve inventory held by an open checkout", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "lf-commerce-"));
    const primary = openCatalogDatabase(path.join(directory, "catalog.sqlite"));
    const secondary = openCatalogDatabase(path.join(directory, "catalog.sqlite"));
    secondary.exec("PRAGMA busy_timeout = 0");

    try {
      const { variantId } = sell(primary, { inventoryCount: 1 });
      const cartA = createCart(primary, now);
      const cartB = createCart(primary, now);
      addCartItem(primary, cartA, variantId, 1, [], now);
      addCartItem(primary, cartB, variantId, 1, [], now);
      rate(primary);
      primary.exec("BEGIN IMMEDIATE");
      assert.throws(() => placePendingOrder(secondary, cartB, now));
      primary.exec("ROLLBACK");
      placePendingOrder(primary, cartA, now);
      assert.throws(() => placePendingOrder(secondary, cartB, now), CommerceError);
      const held = primary.prepare("SELECT COALESCE(SUM(quantity), 0) AS held FROM inventory_reservations WHERE status = 'reserved'").get() as {
        held: number;
      };
      assert.equal(Number(held.held), 1);
    } finally {
      primary.close();
      secondary.close();
    }
  });

  it("marks an order paid only from a verified webhook and ignores a duplicate delivery", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 2 });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 2, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      attachStripeSession(database, pending.orderId, "cs_test_paid");
      assert.equal(orderForSession(database, "cs_test_paid")?.paymentStatus, "pending");
      assert.throws(() => updateFulfillment(database, pending.orderId, "processing", now), CommerceError);

      const command = paidCommand("cs_test_paid", pending.subtotalMinor);
      assert.equal(applyWebhookCommand(database, command, now).duplicate, false);
      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "paid");
      assert.equal(getOrder(database, pending.orderId)?.email, "guest@example.test");
      assert.equal(getOrder(database, pending.orderId)?.totalMinor, pending.subtotalMinor + 800);
      assert.equal(inventory(database, variantId), 0);
      assert.equal(applyWebhookCommand(database, command, now).duplicate, true);
      assert.equal(inventory(database, variantId), 0);
      updateFulfillment(database, pending.orderId, "processing", now);
      assert.equal(getOrder(database, pending.orderId)?.fulfillmentStatus, "processing");

      applyWebhookCommand(
        database,
        { kind: "refunded", eventId: "evt_refund_1", eventType: "charge.refunded", paymentIntentId: "pi_cs_test_paid" },
        now,
      );
      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "refunded");
      assert.equal(inventory(database, variantId), 0);
    });
  });

  it("refuses a paid webhook that includes tax or a mismatched total", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, { inventoryCount: 1 });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, [], now);
      rate(database);
      const pending = placePendingOrder(database, cartId, now);
      attachStripeSession(database, pending.orderId, "cs_test_tax");
      const taxed = { ...paidCommand("cs_test_tax", pending.subtotalMinor), eventId: "evt_tax", taxMinor: 100 };

      assert.throws(() => applyWebhookCommand(database, taxed, now), CommerceError);
      assert.equal(getOrder(database, pending.orderId)?.paymentStatus, "pending");

      const mismatched = { ...paidCommand("cs_test_tax", pending.subtotalMinor), eventId: "evt_mismatch", amountTotalMinor: 1 };
      assert.throws(() => applyWebhookCommand(database, mismatched, now), CommerceError);
      assert.equal(inventory(database, variantId), 1);
    });
  });

  it("builds a test Checkout session from catalog prices and saved shipping", () => {
    const params = buildCheckoutSessionParams({
      orderId: "order-1",
      origin: "http://localhost:3010",
      expiresAt: new Date(now.getTime() + 31 * 60 * 1000),
      lines: [{ name: "Test piece", description: "One size", unitAmountMinor: 12500, quantity: 1 }],
      rates: [{ id: "rate-1", label: "Test shipping", amountMinor: 800, currency: "USD", countries: ["US"], active: true }],
    });

    assert.equal(params.automatic_tax?.enabled, false);
    assert.equal(params.line_items?.[0].price_data?.unit_amount, 12500);
    assert.equal(params.shipping_options?.[0].shipping_rate_data?.fixed_amount?.amount, 800);
    assert.equal(params.shipping_options?.[0].shipping_rate_data?.delivery_estimate, undefined);
    assert.equal(params.success_url?.includes("/checkout/return"), true);
    const expiresAt = checkoutExpiresAt(now);
    assert.equal(expiresAt.getTime() - now.getTime(), holdMs);
    assert.equal(holdMs >= stripeCheckoutMinMs && holdMs <= stripeCheckoutMaxMs, true);
    assert.equal(params.expires_at, Math.floor(new Date(now.getTime() + 31 * 60 * 1000).getTime() / 1000));
  });

  it("verifies a webhook signature and reads the event type", () => {
    const payload = JSON.stringify({
      id: "evt_signature",
      object: "event",
      type: "checkout.session.expired",
      data: { object: { id: "cs_expired", object: "checkout.session" } },
    });
    const secret = "whsec_test_secret";
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = verifyWebhook(payload, header, secret);

    assert.equal(event.type, "checkout.session.expired");
    assert.equal(commandFromStripeEvent(event)?.kind, "expired");
    assert.throws(() => verifyWebhook(payload, header, "whsec_wrong_secret"));
  });
});
