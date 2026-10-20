import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openCatalogDatabase } from "@/lib/catalog-store/db";
import { adminAccess } from "@/lib/catalog-store/auth";
import type { ProductInput } from "@/lib/catalog-store/types";
import { CommerceError } from "@/lib/commerce/errors";
import type { WebhookCommand } from "@/lib/commerce/events";
import { authenticateAdmin, createAdminUser, loginFailureLimit } from "@/lib/platform/accounts";
import { saveCatalogProduct } from "@/lib/platform/catalog-repo";
import { isMigratableCatalogSlug } from "@/lib/platform/catalog-filter";
import { manualReviewDetail, sessionPaymentGraceMs } from "@/lib/commerce/config";
import { reconcileReservations, reviewCheckoutReservation } from "@/lib/commerce/reconciliation";
import {
  addCartItem,
  applyReservationDecision,
  applyWebhookCommand,
  attachStripeSession,
  createCart,
  getOrder,
  listReservationCandidates,
  placePendingOrder,
  readCart,
  releaseExpiredReservations,
  saveShippingRate,
  variantLockSql,
} from "@/lib/platform/commerce-repo";
import { displayPath, privatePreviewAllowed } from "@/data/image-assets";
import { allowsSqlite, appEnv, assertDatabaseUrl, assertStripeTestConfiguration, authConfiguration, databaseConfigured, mediaBackend } from "@/lib/platform/env";
import { importSqliteCatalog } from "@/lib/platform/import-sqlite";
import { redact } from "@/lib/platform/log";
import { inspectImage, isPrivatePreviewId, mediaAccessDecision } from "@/lib/platform/media-policy";
import { putMediaBytes, readMediaBytes } from "@/lib/platform/media-store";
import { appliedMigrationVersions, migrate } from "@/lib/platform/migrate";
import { createQuoteRequest, getQuoteRequest } from "@/lib/platform/quote-repo";
import { openPglite } from "./support/pglite";

const now = new Date("2026-10-18T15:00:00.000Z");
let sequence = 0;

async function database() {
  const sql = await openPglite();
  await migrate(sql);
  return sql;
}

async function sell(sql: Awaited<ReturnType<typeof database>>, overrides: Partial<ProductInput> = {}) {
  sequence += 1;
  const input: ProductInput = {
    name: overrides.name ?? `Hosted record ${sequence}`,
    slug: overrides.slug ?? `hosted-record-${sequence}`,
    summary: "A record created inside the test database.",
    description: "This description exists only inside the test database.",
    categoryId: "cat-accessories",
    status: overrides.status ?? "published",
    madeToOrder: false,
    madeToOrderNote: "",
    purchaseMode: overrides.purchaseMode ?? "checkout",
    customizationGroups: overrides.customizationGroups,
    variants: overrides.variants ?? [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }],
    images: [],
  };
  const product = await saveCatalogProduct(sql, input, []);
  return { productId: product.id, variantId: product.variants[0].id };
}

function reservationBook(sql: Awaited<ReturnType<typeof database>>) {
  return {
    listCandidates: (at: Date) => listReservationCandidates(sql, at),
    apply: (orderId: string, action: "release" | "hold", detail: string, at: Date) => applyReservationDecision(sql, orderId, action, detail, at),
  };
}

function paid(sessionId: string, subtotalMinor: number): Extract<WebhookCommand, { kind: "paid" }> {
  return {
    kind: "paid",
    eventId: `evt_${sessionId}`,
    eventType: "checkout.session.completed",
    sessionId,
    paymentIntentId: `pi_${sessionId}`,
    email: "guest@example.test",
    shippingAmountMinor: 800,
    taxMinor: 0,
    amountTotalMinor: subtotalMinor + 800,
    address: { name: "Test Guest", line1: "1 Test Street", line2: "", city: "Test City", region: "TS", postalCode: "00000", country: "US" },
  };
}

describe("hosted configuration", () => {
  it("fails closed when environment values are missing or live", () => {
    assert.equal(appEnv({}), "local");
    assert.equal(appEnv({ VERCEL: "1" }), "production");
    assert.throws(() => appEnv({ APP_ENV: "prod" }), /APP_ENV must be local, staging, or production/);
    assert.equal(allowsSqlite({ APP_ENV: "local" }), true);
    assert.equal(allowsSqlite({ APP_ENV: "production" }), false);
    assert.equal(databaseConfigured({ APP_ENV: "local" }), true);
    assert.equal(databaseConfigured({ APP_ENV: "staging" }), false);
    assert.equal(databaseConfigured({ APP_ENV: "staging", DATABASE_URL: "postgres://example" }), true);
    assert.equal(allowsSqlite({ APP_ENV: "local", DATABASE_URL: "postgres://example" }), false);
    assert.throws(() => assertDatabaseUrl(undefined), /DATABASE_URL is required/);
    assert.throws(() => assertDatabaseUrl("sqlite://catalog.sqlite"), /PostgreSQL connection string/);
    const liveKey = "sk_live_example_secret_value";
    assert.throws(() => assertStripeTestConfiguration(liveKey), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(liveKey), false);
      assert.match(error.message, /Live Stripe keys are refused/);
      return true;
    });
    assert.deepEqual(authConfiguration({}), { error: "AUTH_SECRET is not set." });
    assert.deepEqual(authConfiguration({ AUTH_SECRET: "short" }), { error: "AUTH_SECRET must be at least 32 characters." });
    assert.equal(mediaBackend({ APP_ENV: "production" }), "unconfigured");
    assert.equal(mediaBackend({ APP_ENV: "local" }), "local");
    assert.equal(redact("connect postgres://user:secret@host/db with sk_test_abc"), "connect [redacted] with [redacted]");
    assert.equal(privatePreviewAllowed({ NODE_ENV: "production" }), false);
    assert.equal(privatePreviewAllowed({ NODE_ENV: "production", VERCEL_ENV: "production", NEXT_PUBLIC_PREVIEW_PHOTOS: "1" }), false);
    assert.equal(privatePreviewAllowed({ NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
    assert.equal(privatePreviewAllowed({ NODE_ENV: "development" }), true);
    const previous = {
      vercel: process.env.VERCEL_ENV,
      preview: process.env.NEXT_PUBLIC_PREVIEW_PHOTOS,
    };

    try {
      delete process.env.VERCEL_ENV;
      delete process.env.NEXT_PUBLIC_PREVIEW_PHOTOS;
      assert.equal(privatePreviewAllowed(), false);
      assert.equal(displayPath("/images/img-5249.webp"), undefined);
      process.env.NEXT_PUBLIC_PREVIEW_PHOTOS = "1";
      process.env.VERCEL_ENV = "production";
      assert.equal(privatePreviewAllowed(), false);
      assert.equal(displayPath("/images/img-5249.webp"), undefined);
      process.env.VERCEL_ENV = "preview";
      assert.equal(displayPath("/images/img-5249.webp"), "/private-preview/img-5249.webp");
    } finally {
      if (previous.vercel === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = previous.vercel;
      if (previous.preview === undefined) delete process.env.NEXT_PUBLIC_PREVIEW_PHOTOS;
      else process.env.NEXT_PUBLIC_PREVIEW_PHOTOS = previous.preview;
    }
  });
});

describe("hosted postgres commerce", () => {
  it("applies versioned migrations once", async () => {
    const sql = await openPglite();
    assert.deepEqual(await migrate(sql), [1, 2, 3, 4]);
    assert.deepEqual(await migrate(sql), []);
    assert.deepEqual(await appliedMigrationVersions(sql), [1, 2, 3, 4]);
  });

  it("holds the last finished piece when two checkouts reserve it together", async () => {
    const sql = await database();
    assert.match(variantLockSql, /FOR UPDATE/);
    const { variantId } = await sell(sql, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const cartA = await createCart(sql, now);
    const cartB = await createCart(sql, now);
    await addCartItem(sql, cartA, variantId, 1, [], now);
    await addCartItem(sql, cartB, variantId, 1, [], now);
    await saveShippingRate(sql, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const results = await Promise.allSettled([placePendingOrder(sql, cartA, now), placePendingOrder(sql, cartB, now)]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    const held = await sql.query<{ held: number }>("SELECT COALESCE(SUM(quantity), 0) AS held FROM inventory_reservations WHERE status = 'reserved'");
    assert.equal(Number(held[0]?.held), 1);
  });

  it("keeps a Checkout session through the payment grace and still records a late payment", async () => {
    const sql = await database();
    const { variantId } = await sell(sql, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const cartId = await createCart(sql, now);
    await addCartItem(sql, cartId, variantId, 1, [], now);
    await saveShippingRate(sql, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const pending = await placePendingOrder(sql, cartId, now);
    await attachStripeSession(sql, pending.orderId, "cs_grace");
    await sql.execute("UPDATE orders SET expires_at = ? WHERE id = ?", [new Date(now.getTime() - 60_000).toISOString(), pending.orderId]);
    await releaseExpiredReservations(sql, now);
    assert.equal((await getOrder(sql, pending.orderId))?.paymentStatus, "pending");
    await applyWebhookCommand(sql, paid("cs_grace", pending.subtotalMinor), now);
    await applyWebhookCommand(sql, { ...paid("cs_grace", pending.subtotalMinor), eventId: "evt_cs_grace_again" }, now);
    const inventory = await sql.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [variantId]);
    assert.equal((await getOrder(sql, pending.orderId))?.paymentStatus, "paid");
    assert.equal(Number(inventory[0]?.inventory_count), 0);

    const held = await database();
    const heldVariant = await sell(held, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const heldCart = await createCart(held, now);
    const otherCart = await createCart(held, now);
    await addCartItem(held, heldCart, heldVariant.variantId, 1, [], now);
    await addCartItem(held, otherCart, heldVariant.variantId, 1, [], now);
    await saveShippingRate(held, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const heldOrder = await placePendingOrder(held, heldCart, now);
    await attachStripeSession(held, heldOrder.orderId, "cs_hold");
    const duringRetry = new Date(now.getTime() + 32 * 60 * 1000);
    await assert.rejects(placePendingOrder(held, otherCart, duringRetry), CommerceError);
    await applyWebhookCommand(held, { kind: "expired", eventId: "evt_hold_expired", eventType: "checkout.session.expired", sessionId: "cs_hold" }, duringRetry);
    assert.equal((await getOrder(held, heldOrder.orderId))?.paymentStatus, "pending");
    await applyWebhookCommand(held, { ...paid("cs_hold", heldOrder.subtotalMinor), eventId: "evt_hold_paid" }, duringRetry);
    const heldInventory = await held.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [heldVariant.variantId]);
    assert.equal(Number(heldInventory[0]?.inventory_count), 0);

    const late = await database();
    const lateVariant = await sell(late, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const lateCart = await createCart(late, now);
    const lateOther = await createCart(late, now);
    await addCartItem(late, lateCart, lateVariant.variantId, 1, [], now);
    await addCartItem(late, lateOther, lateVariant.variantId, 1, [], now);
    await saveShippingRate(late, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const lateOrder = await placePendingOrder(late, lateCart, now);
    await attachStripeSession(late, lateOrder.orderId, "cs_late");
    await late.execute("UPDATE orders SET expires_at = ? WHERE id = ?", [new Date(now.getTime() - sessionPaymentGraceMs - 60_000).toISOString(), lateOrder.orderId]);
    await releaseExpiredReservations(late, now);
    const lateHeld = await getOrder(late, lateOrder.orderId);
    const reviews = await late.query<{ id: string }>("SELECT id FROM order_events WHERE order_id = ? AND detail = ?", [lateOrder.orderId, manualReviewDetail]);
    assert.equal(lateHeld?.paymentStatus, "pending");
    assert.equal(lateHeld?.needsReview, true);
    assert.equal(reviews.length, 1);
    await assert.rejects(placePendingOrder(late, lateOther, now), CommerceError);
    await applyWebhookCommand(late, { ...paid("cs_late", lateOrder.subtotalMinor), eventId: "evt_cs_late" }, now);
    const lateInventory = await late.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [lateVariant.variantId]);
    assert.equal((await getOrder(late, lateOrder.orderId))?.paymentStatus, "paid");
    assert.equal(Number(lateInventory[0]?.inventory_count), 0);
  });

  it("releases a reservation after the hold expires", async () => {
    const sql = await database();
    const { variantId } = await sell(sql, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const cartId = await createCart(sql, now);
    await addCartItem(sql, cartId, variantId, 1, [], now);
    await saveShippingRate(sql, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const pending = await placePendingOrder(sql, cartId, now);
    await releaseExpiredReservations(sql, new Date(now.getTime() + 32 * 60 * 1000));
    assert.equal((await getOrder(sql, pending.orderId))?.paymentStatus, "canceled");
    const nextCart = await createCart(sql, now);
    await addCartItem(sql, nextCart, variantId, 1, [], now);
    const next = await placePendingOrder(sql, nextCart, now);
    assert.equal(next.subtotalMinor, 10000);
  });

  it("treats repeated and out-of-order Stripe webhooks idempotently", async () => {
    const sql = await database();
    const { variantId } = await sell(sql, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const cartId = await createCart(sql, now);
    await addCartItem(sql, cartId, variantId, 1, [], now);
    await saveShippingRate(sql, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const pending = await placePendingOrder(sql, cartId, now);
    await attachStripeSession(sql, pending.orderId, "cs_hosted");
    const command = paid("cs_hosted", pending.subtotalMinor);
    await assert.rejects(
      applyWebhookCommand(sql, { kind: "refunded", eventId: "evt_refund_early", eventType: "charge.refunded", paymentIntentId: command.paymentIntentId }, now),
      CommerceError,
    );
    const earlyEvents = await sql.query("SELECT id FROM webhook_events");
    assert.equal(earlyEvents.length, 0);
    assert.equal((await applyWebhookCommand(sql, command, now)).duplicate, false);
    assert.equal((await applyWebhookCommand(sql, command, now)).duplicate, true);
    assert.equal((await applyWebhookCommand(sql, { ...command, eventId: "evt_paid_again" }, now)).duplicate, false);
    const inventory = await sql.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [variantId]);
    assert.equal(Number(inventory[0]?.inventory_count), 0);
    await applyWebhookCommand(sql, { kind: "expired", eventId: "evt_expired_late", eventType: "checkout.session.expired", sessionId: "cs_hosted" }, now);
    assert.equal((await getOrder(sql, pending.orderId))?.paymentStatus, "paid");
  });

  it("rolls a failed webhook and a failed transaction back", async () => {
    const sql = await database();
    const { variantId } = await sell(sql, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 2 }] });
    await assert.rejects(
      sql.transaction(async (tx) => {
        await tx.execute("UPDATE variants SET inventory_count = 0 WHERE id = ?", [variantId]);
        throw new Error("fail the order");
      }),
      /fail the order/,
    );
    const inventory = await sql.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [variantId]);
    assert.equal(Number(inventory[0]?.inventory_count), 2);
    const cartId = await createCart(sql, now);
    await addCartItem(sql, cartId, variantId, 1, [], now);
    await saveShippingRate(sql, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const pending = await placePendingOrder(sql, cartId, now);
    await attachStripeSession(sql, pending.orderId, "cs_tax");
    const taxed = { ...paid("cs_tax", pending.subtotalMinor), eventId: "evt_tax", taxMinor: 100 };
    await assert.rejects(applyWebhookCommand(sql, taxed, now), CommerceError);
    assert.equal((await getOrder(sql, pending.orderId))?.paymentStatus, "pending");
    assert.equal((await sql.query("SELECT id FROM webhook_events WHERE id = 'evt_tax'")).length, 0);
  });

  it("reconciles expired, paid, and unavailable Stripe reads without a timer release", async () => {
    const later = new Date(now.getTime() + 32 * 60 * 1000);
    const expired = await database();
    const expiredVariant = await sell(expired, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const expiredCart = await createCart(expired, now);
    const nextCart = await createCart(expired, now);
    await addCartItem(expired, expiredCart, expiredVariant.variantId, 1, [], now);
    await addCartItem(expired, nextCart, expiredVariant.variantId, 1, [], now);
    await saveShippingRate(expired, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const expiredOrder = await placePendingOrder(expired, expiredCart, now);
    await attachStripeSession(expired, expiredOrder.orderId, "cs_expired_read");
    await assert.rejects(placePendingOrder(expired, nextCart, later), CommerceError);
    const released = await reconcileReservations(reservationBook(expired), later, async () => ({
      sessionStatus: "expired",
      paymentStatus: "unpaid",
      paymentIntentStatus: null,
    }));
    assert.equal(released.released, 1);
    assert.equal((await placePendingOrder(expired, nextCart, later)).subtotalMinor, 10000);

    const paidDb = await database();
    const paidVariant = await sell(paidDb, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const paidCart = await createCart(paidDb, now);
    await addCartItem(paidDb, paidCart, paidVariant.variantId, 1, [], now);
    await saveShippingRate(paidDb, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const paidOrder = await placePendingOrder(paidDb, paidCart, now);
    await attachStripeSession(paidDb, paidOrder.orderId, "cs_paid_first");
    await applyWebhookCommand(paidDb, paid("cs_paid_first", paidOrder.subtotalMinor), later);
    const skipped = await applyReservationDecision(paidDb, paidOrder.orderId, "release", "release:expired", later);
    const paidInventory = await paidDb.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [paidVariant.variantId]);
    assert.equal(skipped, "skipped");
    assert.equal((await getOrder(paidDb, paidOrder.orderId))?.paymentStatus, "paid");
    assert.equal(Number(paidInventory[0]?.inventory_count), 0);

    const failed = await database();
    const failedVariant = await sell(failed, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const failedCart = await createCart(failed, now);
    await addCartItem(failed, failedCart, failedVariant.variantId, 1, [], now);
    await saveShippingRate(failed, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const failedOrder = await placePendingOrder(failed, failedCart, now);
    await attachStripeSession(failed, failedOrder.orderId, "cs_api_down");
    const held = await reconcileReservations(reservationBook(failed), later, async () => {
      throw new Error("stripe unavailable");
    });
    assert.equal(held.held, 1);
    assert.equal((await getOrder(failed, failedOrder.orderId))?.paymentStatus, "pending");

    const reviewDb = await database();
    const reviewVariant = await sell(reviewDb, { variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 1 }] });
    const reviewCart = await createCart(reviewDb, now);
    await addCartItem(reviewDb, reviewCart, reviewVariant.variantId, 1, [], now);
    await saveShippingRate(reviewDb, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
    const reviewOrder = await placePendingOrder(reviewDb, reviewCart, now);
    await attachStripeSession(reviewDb, reviewOrder.orderId, "cs_review");
    const book = reservationBook(reviewDb);
    const uncertain = await reviewCheckoutReservation(
      { orderId: reviewOrder.orderId, sessionId: "cs_review", paymentStatus: "pending" },
      later,
      async () => {
        throw new Error("stripe unavailable");
      },
      book.apply,
    );
    assert.equal(uncertain.outcome, "unavailable");
    assert.equal((await getOrder(reviewDb, reviewOrder.orderId))?.needsReview, true);
    await applyWebhookCommand(reviewDb, paid("cs_review", reviewOrder.subtotalMinor), later);
    const raced = await reviewCheckoutReservation(
      { orderId: reviewOrder.orderId, sessionId: "cs_review", paymentStatus: "pending" },
      later,
      async () => ({ sessionStatus: "expired", paymentStatus: "unpaid", paymentIntentStatus: null }),
      book.apply,
    );
    const reviewInventory = await reviewDb.query<{ inventory_count: number }>("SELECT inventory_count FROM variants WHERE id = ?", [reviewVariant.variantId]);
    assert.equal(raced.outcome, "skipped");
    assert.equal((await getOrder(reviewDb, reviewOrder.orderId))?.paymentStatus, "paid");
    assert.equal(Number(reviewInventory[0]?.inventory_count), 0);
  });

  it("prices saved customization from the catalog after migration", async () => {
    const sql = await database();
    const { variantId } = await sell(sql, {
      variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 10000, inventoryCount: 3 }],
      customizationGroups: [{ id: "stitch", label: "Stitch", kind: "single", required: true, options: [{ id: "edge", label: "Edge", priceAdjustmentMinor: 250 }] }],
    });
    const cartId = await createCart(sql, now);
    await addCartItem(sql, cartId, variantId, 1, { optionIds: ["edge"], texts: [], measurements: [] }, now, 1);
    const cart = await readCart(sql, cartId, now);
    assert.equal(cart.lines[0]?.unitPriceMinor, 10000);
    assert.equal(cart.lines[0]?.adjustmentMinor, 250);
    assert.equal(cart.subtotalMinor, 10250);
    const again = await readCart(sql, cartId, now);
    assert.equal(again.lines.length, 1);
  });

  it("keeps a quote request after it is saved", async () => {
    const sql = await database();
    const { productId } = await sell(sql, { purchaseMode: "quote-only", slug: "hosted-quote-record" });
    const quote = await createQuoteRequest(sql, { productId, contactName: "Test Guest", email: "guest@example.test", details: "A test request with no price or date." }, now);
    const stored = await getQuoteRequest(sql, quote.id);
    assert.equal(stored?.status, "received");
    assert.equal(stored?.productId, productId);
    assert.equal(stored?.adminNote, "");
  });
});

describe("hosted accounts and media", () => {
  it("authenticates an owner and rate-limits repeated failures", async () => {
    const sql = await database();
    assert.equal(adminAccess({ configured: false, role: "owner" }), "closed");
    const user = await createAdminUser(sql, { email: "owner@example.test", password: "test-password-1234", role: "owner" }, now);
    assert.equal((await authenticateAdmin(sql, "owner@example.test", "test-password-1234", now)).id, user.id);
    const attempts = Array.from({ length: loginFailureLimit }, (_, index) => new Date(now.getTime() + index * 1000));

    for (const attempt of attempts) {
      await assert.rejects(authenticateAdmin(sql, "owner@example.test", "wrong-password", attempt), /does not match/);
    }

    await assert.rejects(authenticateAdmin(sql, "owner@example.test", "test-password-1234", attempts[attempts.length - 1]), /Too many sign-in attempts/);
  });

  it("refuses unpublished and private-preview image access", async () => {
    assert.equal(isPrivatePreviewId("img-5249"), true);
    assert.equal(mediaAccessDecision({ id: "img-5249", approval: "approved-for-demo", actor: "admin" }), "deny");
    assert.equal(mediaAccessDecision({ id: "11111111-1111-1111-1111-111111111111", approval: "withheld", actor: "public" }), "deny");
    assert.equal(mediaAccessDecision({ id: "11111111-1111-1111-1111-111111111111", approval: "withheld", actor: "admin" }), "allow");
    assert.equal(mediaAccessDecision({ id: "11111111-1111-1111-1111-111111111111", approval: "approved-for-demo", actor: "public" }), "allow");
    assert.equal(mediaAccessDecision({ id: "11111111-1111-1111-1111-111111111111", approval: null, actor: "admin" }), "deny");
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
    const inspected = inspectImage(jpeg, "image/jpeg");
    assert.equal("contentType" in inspected ? inspected.contentType : "", "image/jpeg");
    assert.ok("error" in inspectImage(jpeg, "image/png"));
    assert.ok("error" in inspectImage(new Uint8Array(8 * 1024 * 1024 + 1), "image/jpeg"));
    const directory = await mkdtemp(path.join(tmpdir(), "lunafae-media-"));
    const previous = process.env.MEDIA_LOCAL_DIR;
    process.env.MEDIA_LOCAL_DIR = directory;

    try {
      const id = "11111111-1111-4111-8111-111111111111";
      await putMediaBytes(id, jpeg, "image/jpeg");
      const stored = await readMediaBytes(id);
      assert.equal(stored?.bytes[0], 0xff);
      assert.equal(await readMediaBytes("img-5249").catch((error: unknown) => error instanceof Error && /unexpected id/.test(error.message)), true);
    } finally {
      if (previous === undefined) {
        delete process.env.MEDIA_LOCAL_DIR;
      } else {
        process.env.MEDIA_LOCAL_DIR = previous;
      }

      await rm(directory, { recursive: true, force: true });
    }
  });

  it("skips fictional and private-preview rows when copying SQLite", async () => {
    assert.equal(isMigratableCatalogSlug("example-narrow-collar"), false);
    assert.equal(isMigratableCatalogSlug("test-collar"), false);
    assert.equal(isMigratableCatalogSlug("local-verification-record"), false);
    const source = openCatalogDatabase(":memory:");
    const destination = await database();
    const stamp = now.toISOString();
    source
      .prepare(
        `INSERT INTO products (
           id, slug, name, summary, description, category_id, status, made_to_order, made_to_order_note,
           purchase_mode, customization_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'cat-accessories', 'draft', 0, '', 'quote-only', '[]', ?, ?)`,
      )
      .run("kept-id", "keeper-record", "Keeper record", "Summary", "Description", stamp, stamp);
    source
      .prepare(
        `INSERT INTO products (
           id, slug, name, summary, description, category_id, status, made_to_order, made_to_order_note,
           purchase_mode, customization_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'cat-accessories', 'draft', 0, '', 'quote-only', '[]', ?, ?)`,
      )
      .run("fiction-id", "example-narrow-collar", "Example", "Summary", "Description", stamp, stamp);
    source.prepare("INSERT INTO variants (id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position) VALUES (?, ?, ?, ?, 0, 'USD', 100, 1, 0)").run("kept-variant", "kept-id", "One size", "kept-sku");
    source.prepare("INSERT INTO product_images (id, product_id, asset_id, depicts_product, position) VALUES (?, ?, ?, 0, 0)").run("preview-image", "kept-id", "img-5249");
    source
      .prepare("INSERT INTO quote_requests (id, product_id, product_name, contact_name, email, details, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'received', '', ?, ?)")
      .run("kept-quote", "kept-id", "Keeper record", "Guest", "guest@example.test", "A request with no price.", stamp, stamp);
    const result = await importSqliteCatalog(source, destination);
    source.close();
    assert.equal(result.products, 1);
    assert.equal(result.skippedProducts, 1);
    assert.equal(result.skippedImages, 1);
    assert.equal((await destination.query("SELECT id FROM products")).length, 1);
    assert.equal((await destination.query("SELECT id FROM product_images")).length, 0);
    assert.equal((await destination.query("SELECT id FROM quote_requests")).length, 1);
    assert.equal((await destination.query("SELECT id FROM orders")).length, 0);
  });
});
