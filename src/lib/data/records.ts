import { findCatalogAsset, catalogAssetIds } from "@/lib/catalog-store/assets";
import { getCatalogDatabase } from "@/lib/catalog-store/db";
import type { CatalogAssetRecord } from "@/lib/catalog-store/present";
import type { CatalogCategory, CatalogProduct, CategoryInput, ProductInput } from "@/lib/catalog-store/types";
import * as sqliteProducts from "@/lib/catalog-store/products";
import type { ConfigurationInput } from "@/lib/commerce/selection";
import * as sqliteQuotes from "@/lib/commerce/quotes";
import type { QuoteRequest } from "@/lib/commerce/quotes";
import * as sqliteStore from "@/lib/commerce/store";
import type { FulfillmentStatus } from "@/lib/commerce/policy";
import type { CartView, PendingCheckout, ShippingRate, StoredOrder } from "@/lib/commerce/store";
import type { WebhookCommand } from "@/lib/commerce/events";
import { allowsSqlite } from "@/lib/platform/env";
import * as pgCatalog from "@/lib/platform/catalog-repo";
import * as pgCommerce from "@/lib/platform/commerce-repo";
import { mediaAsset, listMediaRecords } from "@/lib/platform/media-records";
import * as pgQuotes from "@/lib/platform/quote-repo";
import { logError } from "@/lib/platform/log";
import { applicationSql } from "@/lib/platform/runtime";
import { listDeliveries, senderFromEnv } from "@/lib/ops/notifications";
import { getCustomerOrder, listCustomerOrders, listOrderActivity, notifyAfterWebhook, notifyQuoteReceived, notifyQuoteStatus, orderShipmentFields, requestOrigin, saveShipment } from "@/lib/ops/orders";
import { getPolicy, listPolicies, savePolicy } from "@/lib/ops/policies";
import { addOrderEvent, issueTrackingToken, lookupPublicOrder, rotateTrackingToken, trackingHintMatchesOrder } from "@/lib/ops/tracking";

async function sql() {
  return applicationSql();
}

export async function listCategories(): Promise<CatalogCategory[]> {
  return allowsSqlite() ? sqliteProducts.listCategories(getCatalogDatabase()) : pgCatalog.listCategories(await sql());
}

export async function listCatalogProducts(scope: "public" | "admin"): Promise<CatalogProduct[]> {
  return allowsSqlite() ? sqliteProducts.listCatalogProducts(getCatalogDatabase(), scope) : pgCatalog.listCatalogProducts(await sql(), scope);
}

export async function getCatalogProduct(id: string): Promise<CatalogProduct | undefined> {
  return allowsSqlite() ? sqliteProducts.getCatalogProduct(getCatalogDatabase(), id) : pgCatalog.getCatalogProduct(await sql(), id);
}

export async function getPublishedBySlug(slug: string): Promise<CatalogProduct | undefined> {
  return allowsSqlite() ? sqliteProducts.getPublishedBySlug(getCatalogDatabase(), slug) : pgCatalog.getPublishedBySlug(await sql(), slug);
}

export async function listRelatedPublished(product: CatalogProduct): Promise<CatalogProduct[]> {
  return allowsSqlite() ? sqliteProducts.listRelatedPublished(getCatalogDatabase(), product) : pgCatalog.listRelatedPublished(await sql(), product);
}

export async function saveCatalogProduct(input: ProductInput, allowedAssetIds: readonly string[]): Promise<CatalogProduct> {
  return allowsSqlite() ? sqliteProducts.saveCatalogProduct(getCatalogDatabase(), input, allowedAssetIds) : pgCatalog.saveCatalogProduct(await sql(), input, allowedAssetIds);
}

export async function deleteCatalogProduct(id: string): Promise<void> {
  if (allowsSqlite()) {
    sqliteProducts.deleteCatalogProduct(getCatalogDatabase(), id);
    return;
  }

  await pgCatalog.deleteCatalogProduct(await sql(), id);
}

export async function createCategory(input: CategoryInput): Promise<CatalogCategory> {
  return allowsSqlite() ? sqliteProducts.createCategory(getCatalogDatabase(), input) : pgCatalog.createCategory(await sql(), input);
}

export async function createCart(now: Date): Promise<string> {
  return allowsSqlite() ? sqliteStore.createCart(getCatalogDatabase(), now) : pgCommerce.createCart(await sql(), now);
}

export async function addCartItem(
  cartId: string,
  variantId: string,
  quantity: number,
  configuration: readonly string[] | ConfigurationInput,
  now: Date,
  submittedPrice?: unknown,
): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.addCartItem(getCatalogDatabase(), cartId, variantId, quantity, configuration, now, submittedPrice);
    return;
  }

  await pgCommerce.addCartItem(await sql(), cartId, variantId, quantity, configuration, now, submittedPrice);
}

export async function setCartItemQuantity(cartId: string, itemId: string, quantity: number, now: Date): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.setCartItemQuantity(getCatalogDatabase(), cartId, itemId, quantity, now);
    return;
  }

  await pgCommerce.setCartItemQuantity(await sql(), cartId, itemId, quantity, now);
}

export async function removeCartItem(cartId: string, itemId: string): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.removeCartItem(getCatalogDatabase(), cartId, itemId);
    return;
  }

  await pgCommerce.removeCartItem(await sql(), cartId, itemId);
}

export async function readCart(cartId: string, now: Date): Promise<CartView> {
  return allowsSqlite() ? sqliteStore.readCart(getCatalogDatabase(), cartId, now) : pgCommerce.readCart(await sql(), cartId, now);
}

export async function listShippingRates(): Promise<ShippingRate[]> {
  return allowsSqlite() ? sqliteStore.listShippingRates(getCatalogDatabase()) : pgCommerce.listShippingRates(await sql());
}

export async function activeShippingRates(): Promise<ShippingRate[]> {
  return allowsSqlite() ? sqliteStore.activeShippingRates(getCatalogDatabase()) : pgCommerce.activeShippingRates(await sql());
}

export async function saveShippingRate(input: { label: string; amountMinor: number; countries: string[] }, now: Date): Promise<ShippingRate> {
  return allowsSqlite() ? sqliteStore.saveShippingRate(getCatalogDatabase(), input, now) : pgCommerce.saveShippingRate(await sql(), input, now);
}

export async function setShippingRateActive(id: string, active: boolean): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.setShippingRateActive(getCatalogDatabase(), id, active);
    return;
  }

  await pgCommerce.setShippingRateActive(await sql(), id, active);
}

export async function findPendingCheckout(cartId: string, now: Date): Promise<{ id: string; stripeSessionId: string | null } | null> {
  return allowsSqlite() ? sqliteStore.findPendingCheckout(getCatalogDatabase(), cartId, now) : pgCommerce.findPendingCheckout(await sql(), cartId, now);
}

export async function placePendingOrder(cartId: string, now: Date): Promise<PendingCheckout> {
  return allowsSqlite() ? sqliteStore.placePendingOrder(getCatalogDatabase(), cartId, now) : pgCommerce.placePendingOrder(await sql(), cartId, now);
}

export async function attachStripeSession(orderId: string, sessionId: string): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.attachStripeSession(getCatalogDatabase(), orderId, sessionId);
    return;
  }

  await pgCommerce.attachStripeSession(await sql(), orderId, sessionId);
}

export async function abortPendingOrder(orderId: string, now: Date): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.abortPendingOrder(getCatalogDatabase(), orderId, now);
    return;
  }

  await pgCommerce.abortPendingOrder(await sql(), orderId, now);
}

export async function releaseExpiredReservations(now: Date): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.releaseExpiredReservations(getCatalogDatabase(), now);
    return;
  }

  await pgCommerce.releaseExpiredReservations(await sql(), now);
}

export async function applyWebhookCommand(command: WebhookCommand, now: Date): Promise<{ duplicate: boolean }> {
  const result = allowsSqlite()
    ? sqliteStore.applyWebhookCommand(getCatalogDatabase(), command, now)
    : await pgCommerce.applyWebhookCommand(await sql(), command, now);

  try {
    await notifyAfterWebhook(await sql(), command, result.duplicate, now, senderFromEnv(), requestOrigin(process.env.AUTH_URL));
  } catch (error) {
    logError("order-notification", error);
  }

  return result;
}

export async function orderForSession(sessionId: string): Promise<StoredOrder | null> {
  return allowsSqlite() ? sqliteStore.orderForSession(getCatalogDatabase(), sessionId) : pgCommerce.orderForSession(await sql(), sessionId);
}

export async function listOrders(): Promise<StoredOrder[]> {
  return allowsSqlite() ? sqliteStore.listOrders(getCatalogDatabase()) : pgCommerce.listOrders(await sql());
}

export async function getOrder(id: string): Promise<StoredOrder | null> {
  return allowsSqlite() ? sqliteStore.getOrder(getCatalogDatabase(), id) : pgCommerce.getOrder(await sql(), id);
}

export async function updateFulfillment(orderId: string, next: FulfillmentStatus, now: Date): Promise<void> {
  if (allowsSqlite()) {
    sqliteStore.updateFulfillment(getCatalogDatabase(), orderId, next, now);
  } else {
    await pgCommerce.updateFulfillment(await sql(), orderId, next, now);
  }

  try {
    await addOrderEvent(await sql(), orderId, "fulfillment", `Fulfillment set to ${next}.`, now);
  } catch (error) {
    logError("order-activity", error);
  }
}

export async function createQuoteRequest(input: { productId: string; contactName: string; email: string; details: string }, now: Date): Promise<QuoteRequest> {
  const quote = allowsSqlite() ? sqliteQuotes.createQuoteRequest(getCatalogDatabase(), input, now) : await pgQuotes.createQuoteRequest(await sql(), input, now);

  try {
    await notifyQuoteReceived(await sql(), quote, now, senderFromEnv());
  } catch (error) {
    logError("quote-notification", error);
  }

  return quote;
}

export async function listQuoteRequests(): Promise<QuoteRequest[]> {
  return allowsSqlite() ? sqliteQuotes.listQuoteRequests(getCatalogDatabase()) : pgQuotes.listQuoteRequests(await sql());
}

export async function getQuoteRequest(id: string): Promise<QuoteRequest | null> {
  return allowsSqlite() ? sqliteQuotes.getQuoteRequest(getCatalogDatabase(), id) : pgQuotes.getQuoteRequest(await sql(), id);
}

export async function updateQuoteRequest(id: string, input: { status: string; adminNote: string }, now: Date): Promise<void> {
  if (allowsSqlite()) {
    sqliteQuotes.updateQuoteRequest(getCatalogDatabase(), id, input, now);
  } else {
    await pgQuotes.updateQuoteRequest(await sql(), id, input, now);
  }

  try {
    const quote = await getQuoteRequest(id);

    if (quote) {
      await notifyQuoteStatus(await sql(), quote, now, senderFromEnv());
    }
  } catch (error) {
    logError("quote-notification", error);
  }
}

export async function assignableAssetIds(): Promise<string[]> {
  const media = await listMediaRecords(await sql());
  return [...catalogAssetIds(), ...media.map((record) => record.id)];
}

export async function mediaChoices(): Promise<{ id: string; shortLabel: string; approval: string }[]> {
  const media = await listMediaRecords(await sql());
  return media.map((record) => ({ id: record.id, shortLabel: mediaAsset(record).shortLabel, approval: record.approval }));
}

export async function issueCheckoutTrackingToken(orderId: string, now: Date): Promise<string | null> {
  try {
    return await issueTrackingToken(await sql(), orderId, now);
  } catch (error) {
    logError("tracking-token", error);
    return null;
  }
}

export async function lookupTrackedOrder(token: string, subject: string, now: Date) {
  return lookupPublicOrder(await sql(), token, subject, now);
}

export async function checkoutTrackingMatches(token: string, orderId: string): Promise<boolean> {
  return trackingHintMatchesOrder(await sql(), token, orderId);
}

export async function rotateOrderTracking(orderId: string, now: Date): Promise<string> {
  return rotateTrackingToken(await sql(), orderId, now);
}

export async function orderActivity(orderId: string) {
  return listOrderActivity(await sql(), orderId);
}

export async function orderShipment(orderId: string) {
  return orderShipmentFields(await sql(), orderId);
}

export async function orderDeliveries(relatedId: string) {
  return listDeliveries(await sql(), relatedId);
}

export async function saveOrderShipment(orderId: string, input: { carrier: string; trackingNumber: string }, now: Date): Promise<void> {
  await saveShipment(await sql(), orderId, input, now, senderFromEnv());
}

export async function customerOrders(customerId: string) {
  return listCustomerOrders(await sql(), customerId);
}

export async function customerOrder(customerId: string, orderId: string) {
  return getCustomerOrder(await sql(), customerId, orderId);
}

export async function storePolicies() {
  return listPolicies(await sql());
}

export async function storePolicy(slug: string) {
  return getPolicy(await sql(), slug);
}

export async function updateStorePolicy(slug: string, body: string, publish: boolean, now: Date) {
  return savePolicy(await sql(), slug, body, publish, now);
}

export async function publishedAssetFinder(): Promise<(id: string) => CatalogAssetRecord | undefined> {
  const media = await listMediaRecords(await sql());
  const approved = new Map(media.filter((record) => record.approval === "approved-for-demo").map((record) => [record.id, mediaAsset(record)]));

  return (id: string) => findCatalogAsset(id) ?? approved.get(id);
}
