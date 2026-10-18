import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { openCatalogDatabase } from "@/lib/catalog-store/db";
import { authenticateCustomer, claimGuestOrders, registerCustomer, verifyCustomerEmail } from "@/lib/customer/accounts";
import { customerSessionMs, openCustomerSession, sealCustomerSession } from "@/lib/customer/session";
import { clientAddress } from "@/lib/ops/client-subject";
import { checkoutCanStart, mobileCheckoutFieldClass } from "@/lib/commerce/mobile";
import type { WebhookCommand } from "@/lib/commerce/events";
import { SignInError } from "@/lib/platform/accounts";
import { emailConfiguration } from "@/lib/platform/env";
import { migrate } from "@/lib/platform/migrate";
import { dispatchNotification } from "@/lib/ops/notifications";
import { filterOrders, filterQuotes } from "@/lib/ops/filters";
import { getCustomerOrder, notificationKindForWebhook, notifyAfterWebhook, saveShipment } from "@/lib/ops/orders";
import { policyPublicationDecision, savePolicy } from "@/lib/ops/policies";
import { accountAttemptLimit, attemptAllowed, issueTrackingToken, lookupPublicOrder, publicOrderColumns, recordAttempt, rotateTrackingToken, trackingAttemptLimit } from "@/lib/ops/tracking";
import { orderCancellation, orderConfirmation, shipmentNotice } from "@/lib/ops/templates";
import type { StoredOrder } from "@/lib/commerce/store";
import type { QuoteRequest } from "@/lib/commerce/quotes";
import { openPglite } from "./support/pglite";

const now = new Date("2026-10-18T15:00:00.000Z");
const secret = "customer-session-secret-value-32";

describe("store operations", () => {
  it("keeps sqlite policy sections unpublished and empty", () => {
    const database = openCatalogDatabase(":memory:");
    const columns = database.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
    assert.ok(columns.some((column) => column.name === "tracking_number"));
    const policies = database.prepare("SELECT body, published FROM store_policies").all() as { body: string; published: number }[];
    assert.equal(policies.length, 5);
    assert.ok(policies.every((policy) => policy.body === "" && policy.published === 0));
  });

  it("tracks an order only with a hashed token and hides the street address", async () => {
    const sql = await migrated();
    const orderId = await insertOrder(sql, { payment: "paid", email: "buyer@example.com", line1: "Hidden street" });
    const token = await issueTrackingToken(sql, orderId, now);
    const stored = await sql.query<{ token_hash: string }>("SELECT token_hash FROM order_tracking_tokens");
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0]?.token_hash, token);
    assert.equal(stored[0]?.token_hash.includes(token), false);
    assert.equal(publicOrderColumns.join(" ").includes("ship_line1"), false);
    assert.equal(publicOrderColumns.join(" ").includes("email"), false);

    const found = await lookupPublicOrder(sql, token, "subject", now);
    assert.equal(found.status, "found");
    if (found.status !== "found") return;
    assert.equal("email" in found.order, false);
    assert.equal(JSON.stringify(found.order).includes("Hidden street"), false);
    assert.equal(found.order.paymentStatus, "paid");
    assert.equal(found.order.fulfillmentStatus, "unfulfilled");
    assert.equal(found.order.shipment, "not-recorded");
    assert.equal(found.order.lines[0]?.selections[0], "Stitching: Silver");

    const guessed = await lookupPublicOrder(sql, randomBytes(32).toString("base64url"), "subject", now);
    assert.equal(guessed.status, "missing");
    assert.equal(guessed.status === "missing" && guessed.message, "No order matches this tracking link.");

    const rotated = await rotateTrackingToken(sql, orderId, now);
    const revoked = await lookupPublicOrder(sql, token, "subject-2", now);
    const replacement = await lookupPublicOrder(sql, rotated, "subject-2", now);
    assert.equal(revoked.status, "missing");
    assert.equal(replacement.status, "found");
  });

  it("rate-limits tracking attempts before it reveals an order", async () => {
    const sql = await migrated();
    const orderId = await insertOrder(sql, { payment: "pending", email: "buyer@example.com" });
    const token = await issueTrackingToken(sql, orderId, now);

    for (let index = 0; index < trackingAttemptLimit; index += 1) {
      await sql.execute("INSERT INTO tracking_attempts (id, subject_hash, attempted_at) VALUES (?, 'limited', ?)", [randomUUID(), now.toISOString()]);
    }

    const result = await lookupPublicOrder(sql, token, "limited", now);
    assert.equal(result.status, "limited");
    assert.equal(JSON.stringify(result).includes(orderId), false);
  });

  it("shows pending, paid, canceled, refunded, and shipped states separately", async () => {
    const sql = await migrated();
    const pending = await tokenFor(sql, "pending");
    const paid = await tokenFor(sql, "paid");
    const canceled = await tokenFor(sql, "canceled");
    const refunded = await tokenFor(sql, "refunded");
    const shippedId = await insertOrder(sql, { payment: "paid", email: "buyer@example.com", tracking: "TRACK1" });
    const shipped = await issueTrackingToken(sql, shippedId, now);

    assert.equal((await lookupPublicOrder(sql, pending, "a", now)).status, "found");
    assert.equal(statusOf(await lookupPublicOrder(sql, pending, "b", now)), "pending");
    assert.equal(statusOf(await lookupPublicOrder(sql, paid, "c", now)), "paid");
    assert.equal(statusOf(await lookupPublicOrder(sql, canceled, "d", now)), "canceled");
    assert.equal(statusOf(await lookupPublicOrder(sql, refunded, "e", now)), "refunded");
    const shippedView = await lookupPublicOrder(sql, shipped, "f", now);
    assert.equal(shippedView.status, "found");
    if (shippedView.status === "found") {
      assert.equal(shippedView.order.shipment, "shipped");
      assert.equal(shippedView.order.paymentStatus, "paid");
      assert.equal(shippedView.order.fulfillmentStatus, "unfulfilled");
      assert.equal(shippedView.order.trackingNumber, "TRACK1");
    }
  });

  it("sends a notification once and retries a failed delivery on the same record", async () => {
    const sql = await migrated();
    const calls: string[] = [];
    const sender = {
      async send(message: { idempotencyKey: string }) {
        calls.push(message.idempotencyKey);
        return { providerMessageId: "provider-1" };
      },
    };
    const input = {
      idempotencyKey: "order-confirmation:ord",
      kind: "order-confirmation",
      recipient: "buyer@example.com",
      relatedId: "ord",
      message: orderConfirmation({
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        shipment: "not-recorded" as const,
        carrier: "",
        trackingNumber: "",
        lines: [],
        totalLabel: "$25.00",
        trackingUrl: null,
      }),
    };
    const first = await dispatchNotification(sql, input, sender, now);
    const second = await dispatchNotification(sql, input, sender, now);
    assert.equal(first.status, "sent");
    assert.equal(second.status, "sent");
    assert.deepEqual(calls, ["order-confirmation:ord"]);
    assert.equal((await sql.query("SELECT id FROM notification_deliveries")).length, 1);
    assert.match(input.message.text, /does not promise a ship date/);
    assert.doesNotMatch(input.message.text, /business day/);
    assert.doesNotMatch(
      orderCancellation({
        paymentStatus: "canceled",
        fulfillmentStatus: "canceled",
        shipment: "not-recorded",
        carrier: "",
        trackingNumber: "",
        lines: [],
        totalLabel: "$25.00",
        trackingUrl: null,
      }).text,
      /refund within/,
    );
    assert.match(
      shipmentNotice({
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        shipment: "shipped",
        carrier: "",
        trackingNumber: "TRACK1",
        lines: [],
        totalLabel: "$25.00",
        trackingUrl: null,
      }).text,
      /does not promise a delivery date/,
    );

    let failed = true;
    const flaky = {
      async send() {
        if (failed) {
          failed = false;
          throw new Error("provider down");
        }
        return { providerMessageId: "provider-2" };
      },
    };
    const retryInput = { ...input, idempotencyKey: "shipment:ord:TRACK1", kind: "shipment" };
    const failedDelivery = await dispatchNotification(sql, retryInput, flaky, now);
    const retried = await dispatchNotification(sql, retryInput, flaky, now);
    assert.equal(failedDelivery.status, "failed");
    assert.equal(failedDelivery.attempts, 1);
    assert.equal(retried.status, "sent");
    assert.equal(retried.attempts, 2);
    assert.equal(retried.id, failedDelivery.id);
  });

  it("does not notify before the verified payment or cancellation event", async () => {
    const sql = await migrated();
    const orderId = await insertOrder(sql, { payment: "paid", email: "buyer@example.com", sessionId: "cs_test_123" });
    const calls: string[] = [];
    const sender = {
      async send(message: { idempotencyKey: string }) {
        calls.push(message.idempotencyKey);
        return { providerMessageId: "provider-1" };
      },
    };
    const paid: WebhookCommand = {
      kind: "paid",
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      sessionId: "cs_test_123",
      paymentIntentId: "pi_123",
      email: "buyer@example.com",
      shippingAmountMinor: 0,
      taxMinor: 0,
      amountTotalMinor: 2500,
      address: { name: "A", line1: "Street", line2: "", city: "City", region: "", postalCode: "00000", country: "US" },
    };
    await notifyAfterWebhook(sql, paid, true, now, sender, "http://localhost:3010");
    assert.deepEqual(calls, []);
    await notifyAfterWebhook(sql, { kind: "refunded", eventId: "evt_2", eventType: "charge.refunded", paymentIntentId: "pi_123" }, false, now, sender, "");
    assert.equal(notificationKindForWebhook(paid), "order-confirmation");
    assert.equal(notificationKindForWebhook({ kind: "expired", eventId: "evt_3", eventType: "checkout.session.expired", sessionId: "cs_test_123" }), null);
    assert.equal(notificationKindForWebhook({ kind: "refunded", eventId: "evt_2", eventType: "charge.refunded", paymentIntentId: "pi_123" }), null);
    await notifyAfterWebhook(sql, paid, false, now, sender, "http://localhost:3010");
    assert.deepEqual(calls, [`order-confirmation:${orderId}`]);
    assert.equal(emailConfiguration({}).enabled, false);
    assert.equal(emailConfiguration({ EMAIL_PROVIDER: "resend", EMAIL_API_KEY: "key", EMAIL_FROM: "shop@example.com", EMAIL_SENDER_VERIFIED: "true" }).enabled, false);
    assert.equal(
      emailConfiguration({ EMAIL_PROVIDER: "sendgrid", EMAIL_API_KEY: "key", EMAIL_FROM: "orders@merchant.test", EMAIL_SENDER_VERIFIED: "true" }).enabled,
      true,
    );
  });

  it("verifies email before claiming guest orders and isolates accounts", async () => {
    const sql = await migrated();
    const orderId = await insertOrder(sql, { payment: "paid", email: "buyer@example.com" });
    const registered = await registerCustomer(sql, { email: "buyer@example.com", password: "test-password-1234" }, now, null, "");
    assert.notEqual(registered.verificationToken, null);
    assert.equal(await claimGuestOrders(sql, registered.account.id), 0);
    const before = await sql.query<{ customer_id: string | null }>("SELECT customer_id FROM orders WHERE id = ?", [orderId]);
    assert.equal(before[0]?.customer_id ?? null, null);
    const storedToken = await sql.query<{ token_hash: string }>("SELECT token_hash FROM customer_verification_tokens");
    assert.notEqual(storedToken[0]?.token_hash, registered.verificationToken);

    await assert.rejects(() => authenticateCustomer(sql, "buyer@example.com", "test-password-1234", now), SignInError);
    const verified = await verifyCustomerEmail(sql, registered.verificationToken ?? "", now);
    assert.equal(verified?.emailVerifiedAt === null, false);
    const linked = await sql.query<{ customer_id: string }>("SELECT customer_id FROM orders WHERE id = ?", [orderId]);
    assert.equal(linked[0]?.customer_id, registered.account.id);
    const signedIn = await authenticateCustomer(sql, "Buyer@Example.com", "test-password-1234", now);
    assert.equal(signedIn.id, registered.account.id);

    const other = await registerCustomer(sql, { email: "other@example.com", password: "test-password-1234" }, now, null, "");
    const otherVerified = await verifyCustomerEmail(sql, other.verificationToken ?? "", now);
    assert.equal(await getCustomerOrder(sql, otherVerified?.id ?? "", orderId), null);
    assert.equal((await getCustomerOrder(sql, signedIn.id, orderId))?.lines[0]?.productName, "Collar");
    assert.equal((await sql.query("SELECT id FROM admin_users")).length, 0);
    assert.equal((await sql.query("SELECT id FROM customers")).length, 2);

    const again = await registerCustomer(sql, { email: "buyer@example.com", password: "another-password-123" }, now, null, "");
    assert.equal(again.verificationToken, null);
    assert.equal((await sql.query("SELECT id FROM customers")).length, 2);
  });

  it("expires customer sessions and refuses a tampered session", () => {
    const token = sealCustomerSession("customer-1", now, secret);
    const payload = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString()) as { aud?: string };
    assert.equal(payload.aud, "customer");
    assert.equal(openCustomerSession(token, new Date(now.getTime() + 60_000), secret), "customer-1");
    assert.equal(openCustomerSession(token, new Date(now.getTime() + customerSessionMs + 1), secret), null);
    assert.equal(openCustomerSession(`${token}x`, new Date(now.getTime() + 60_000), secret), null);
  });

  it("filters admin orders and quotes and refuses an empty published policy", async () => {
    const sql = await migrated();
    const orders = [orderFixture("paid", "buyer@example.com"), orderFixture("pending", "other@example.com")];
    assert.equal(filterOrders(orders, { query: "buyer", payment: "paid", fulfillment: "" }).length, 1);
    assert.equal(filterOrders(orders, { query: "", payment: "refunded", fulfillment: "" }).length, 0);
    const quotes = [quoteFixture("received", "buyer@example.com"), quoteFixture("closed", "other@example.com")];
    assert.equal(filterQuotes(quotes, { query: "other", status: "closed" }).length, 1);
    assert.equal("error" in policyPublicationDecision("", true), true);
    await assert.rejects(() => savePolicy(sql, "shipping", "", true, now), /unpublished/);
    const saved = await savePolicy(sql, "shipping", "Owner supplied text.", true, now);
    assert.equal(saved.published, true);
    assert.equal(saved.body, "Owner supplied text.");
    const hidden = await savePolicy(sql, "returns", "Draft text.", false, now);
    assert.equal(hidden.published, false);

    const orderId = await insertOrder(sql, { payment: "pending", email: "buyer@example.com" });
    await assert.rejects(() => saveShipment(sql, orderId, { carrier: "", trackingNumber: "TRACK1" }, now, null), /payment is confirmed/);
    await sql.execute("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);
    const calls: string[] = [];
    await saveShipment(sql, orderId, { carrier: "Carrier entered by owner", trackingNumber: "TRACK1" }, now, {
      async send(message) {
        calls.push(message.idempotencyKey);
        return { providerMessageId: "provider-1" };
      },
    });
    await saveShipment(sql, orderId, { carrier: "Carrier entered by owner", trackingNumber: "TRACK1" }, now, {
      async send(message) {
        calls.push(message.idempotencyKey);
        return { providerMessageId: "provider-1" };
      },
    });
    assert.deepEqual(calls, [`shipment:${orderId}:TRACK1`]);
    const activity = await sql.query<{ kind: string }>("SELECT kind FROM order_events WHERE order_id = ?", [orderId]);
    assert.ok(activity.some((event) => event.kind === "shipment"));

    const orderActions = readFileSync("src/app/admin/order-actions.ts", "utf8");
    const policyActions = readFileSync("src/app/admin/policy-actions.ts", "utf8");
    assert.match(orderActions, /adminDenialMessage/);
    assert.match(policyActions, /adminDenialMessage/);
    assert.match(mobileCheckoutFieldClass, /min-h-12/);
    assert.match(mobileCheckoutFieldClass, /w-full/);
    assert.match(mobileCheckoutFieldClass, /text-base/);
    assert.equal(checkoutCanStart({ blockers: 1, unavailableLines: 0 }), false);
    assert.equal(checkoutCanStart({ blockers: 0, unavailableLines: 0 }), true);
    const headers = { get: (name: string) => (name === "x-forwarded-for" ? "203.0.113.8" : null) };
    assert.equal(clientAddress(headers), "local");
    assert.equal(clientAddress({ get: (name: string) => (name === "x-vercel-forwarded-for" ? "198.51.100.10, 203.0.113.8" : "203.0.113.9") }), "198.51.100.10");
  });

  it("stops repeated account attempts for one client", async () => {
    const sql = await migrated();

    for (let index = 0; index < accountAttemptLimit; index += 1) {
      assert.equal(await attemptAllowed(sql, "account-subject", now, accountAttemptLimit), true);
      await recordAttempt(sql, "account-subject", now);
    }

    assert.equal(await attemptAllowed(sql, "account-subject", now, accountAttemptLimit), false);
  });
});

async function migrated() {
  const sql = await openPglite();
  await migrate(sql);
  return sql;
}

async function insertOrder(
  sql: Awaited<ReturnType<typeof migrated>>,
  input: { payment: string; email: string; line1?: string; tracking?: string; sessionId?: string },
): Promise<string> {
  const id = randomUUID();
  await sql.execute(
    `INSERT INTO orders (
       id, cart_id, stripe_session_id, payment_status, fulfillment_status, email, ship_line1, tracking_number,
       offered_shipping_json, currency, subtotal_minor, total_minor, created_at, updated_at, expires_at
     ) VALUES (?, ?, ?, ?, 'unfulfilled', ?, ?, ?, '[]', 'USD', 2500, 2500, ?, ?, ?)`,
    [id, randomUUID(), input.sessionId ?? null, input.payment, input.email, input.line1 ?? "", input.tracking ?? "", now.toISOString(), now.toISOString(), now.toISOString()],
  );
  await sql.execute(
    `INSERT INTO order_lines (
       id, order_id, product_id, variant_id, product_name, variant_label, sku, unit_price_minor, quantity,
       customization_json, made_to_order, lead_time_note, reserved_quantity
     ) VALUES (?, ?, 'product', 'variant', 'Collar', 'Standard', 'SKU', 2500, 1, ?, 0, '', 0)`,
    [randomUUID(), id, JSON.stringify([{ groupLabel: "Stitching", optionLabel: "Silver", detail: "" }])],
  );
  return id;
}

async function tokenFor(sql: Awaited<ReturnType<typeof migrated>>, payment: string): Promise<string> {
  const orderId = await insertOrder(sql, { payment, email: "buyer@example.com" });
  return issueTrackingToken(sql, orderId, now);
}

function statusOf(result: Awaited<ReturnType<typeof lookupPublicOrder>>): string {
  return result.status === "found" ? result.order.paymentStatus : result.status;
}

function orderFixture(payment: StoredOrder["paymentStatus"], email: string): StoredOrder {
  return {
    id: randomUUID(),
    cartId: "cart",
    stripeSessionId: null,
    stripePaymentIntentId: null,
    paymentStatus: payment,
    fulfillmentStatus: "unfulfilled",
    email,
    shipping: { name: "Buyer", line1: "", line2: "", city: "", region: "", postalCode: "", country: "US" },
    shippingLabel: "",
    shippingAmountMinor: null,
    currency: "USD",
    subtotalMinor: 2500,
    totalMinor: 2500,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: now.toISOString(),
    paidAt: null,
    lines: [],
  };
}

function quoteFixture(status: QuoteRequest["status"], email: string): QuoteRequest {
  return {
    id: randomUUID(),
    productId: "product",
    productName: "Collar",
    contactName: "Buyer",
    email,
    details: "Details",
    status,
    adminNote: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
