import { CommerceError } from "@/lib/commerce/errors";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import type { FulfillmentStatus, PaymentStatus } from "@/lib/commerce/policy";
import { one, type Sql } from "@/lib/platform/sql";
import { dispatchNotification, type EmailSender } from "@/lib/ops/notifications";
import { orderCancellation, orderConfirmation, quoteAcknowledgement, quoteStatusUpdate, shipmentNotice, type NoticeLine, type OrderNotice } from "@/lib/ops/templates";
import { addOrderEvent, issueTrackingToken } from "@/lib/ops/tracking";
import type { WebhookCommand } from "@/lib/commerce/events";

export type OrderActivity = {
  id: string;
  kind: string;
  detail: string;
  createdAt: string;
};

export type CustomerOrderSummary = {
  id: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipment: "shipped" | "not-recorded";
  carrier: string;
  trackingNumber: string;
  currency: "USD";
  totalMinor: number;
  createdAt: string;
  lines: NoticeLine[];
};

export function notificationKindForWebhook(command: WebhookCommand): "order-confirmation" | "order-cancellation" | null {
  if (command.kind === "paid") {
    return "order-confirmation";
  }

  return null;
}

export async function saveShipment(
  sql: Sql,
  orderId: string,
  input: { carrier: string; trackingNumber: string },
  now: Date,
  sender: EmailSender | null,
): Promise<void> {
  const carrier = input.carrier.trim();
  const trackingNumber = input.trackingNumber.trim();

  if (!trackingNumber || trackingNumber.length > 64 || carrier.length > 64 || /[\r\n]/.test(carrier + trackingNumber)) {
    throw new CommerceError(["Enter the tracking number that was given for this order."]);
  }

  const order = await loadNoticeOrder(sql, orderId);

  if (!order || (order.paymentStatus !== "paid" && order.paymentStatus !== "refunded")) {
    throw new CommerceError(["Tracking can be saved after payment is confirmed."]);
  }

  await sql.execute("UPDATE orders SET carrier = ?, tracking_number = ?, shipped_at = ?, updated_at = ? WHERE id = ?", [
    carrier,
    trackingNumber,
    now.toISOString(),
    now.toISOString(),
    orderId,
  ]);
  await addOrderEvent(sql, orderId, "shipment", "Shipment tracking saved.", now);
  const notice = { ...order.notice, shipment: "shipped" as const, carrier, trackingNumber, trackingUrl: null };
  const content = shipmentNotice(notice);
  await dispatchNotification(
    sql,
    {
      idempotencyKey: `shipment:${orderId}:${trackingNumber}`,
      kind: "shipment",
      recipient: order.email,
      relatedId: orderId,
      message: content,
    },
    sender,
    now,
  );
}

export async function orderShipmentFields(sql: Sql, orderId: string): Promise<{ carrier: string; trackingNumber: string }> {
  const row = await one<{ carrier: string; tracking_number: string }>(sql, "SELECT carrier, tracking_number FROM orders WHERE id = ?", [orderId]);
  return { carrier: row?.carrier ?? "", trackingNumber: row?.tracking_number ?? "" };
}

export async function listOrderActivity(sql: Sql, orderId: string): Promise<OrderActivity[]> {
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT id, kind, detail, created_at FROM order_events WHERE order_id = ? ORDER BY created_at",
    [orderId],
  );

  return rows.map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    detail: String(row.detail),
    createdAt: String(row.created_at),
  }));
}

export async function notifyAfterWebhook(sql: Sql, command: WebhookCommand, duplicate: boolean, now: Date, sender: EmailSender | null, origin: string): Promise<void> {
  const kind = notificationKindForWebhook(command);

  if (duplicate || !kind) {
    return;
  }

  const orderId = await orderIdForCommand(sql, command);

  if (!orderId) {
    return;
  }

  await addOrderEvent(sql, orderId, "payment", `Payment recorded as ${command.kind}.`, now);
  const loaded = await loadNoticeOrder(sql, orderId);

  if (!loaded) {
    return;
  }

  const trackingUrlValue = kind === "order-confirmation" && sender ? trackingUrl(origin, await issueTrackingToken(sql, orderId, now)) : null;
  const content = kind === "order-confirmation" ? orderConfirmation({ ...loaded.notice, trackingUrl: trackingUrlValue }) : orderCancellation(loaded.notice);
  await dispatchNotification(
    sql,
    { idempotencyKey: `${kind}:${orderId}`, kind, recipient: loaded.email, relatedId: orderId, message: content },
    sender,
    now,
  );
}

export async function notifyQuoteReceived(sql: Sql, quote: { id: string; email: string; productName: string }, now: Date, sender: EmailSender | null): Promise<void> {
  const content = quoteAcknowledgement({ productName: quote.productName });
  await dispatchNotification(
    sql,
    { idempotencyKey: `quote-received:${quote.id}`, kind: "quote-received", recipient: quote.email, relatedId: quote.id, message: content },
    sender,
    now,
  );
}

export async function notifyQuoteStatus(sql: Sql, quote: { id: string; email: string; productName: string; status: string }, now: Date, sender: EmailSender | null): Promise<void> {
  const content = quoteStatusUpdate({ productName: quote.productName, status: quote.status });
  await dispatchNotification(
    sql,
    {
      idempotencyKey: `quote-status:${quote.id}:${quote.status}`,
      kind: "quote-status",
      recipient: quote.email,
      relatedId: quote.id,
      message: content,
    },
    sender,
    now,
  );
}

export async function listCustomerOrders(sql: Sql, customerId: string): Promise<CustomerOrderSummary[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT id, payment_status, fulfillment_status, carrier, tracking_number, currency, total_minor, created_at
     FROM orders WHERE customer_id = ? ORDER BY created_at`,
    [customerId],
  );

  const orders: CustomerOrderSummary[] = [];

  for (const row of rows) {
    if (row.currency !== "USD") {
      continue;
    }

    orders.push(await customerSummary(sql, row));
  }

  return orders;
}

export async function getCustomerOrder(sql: Sql, customerId: string, orderId: string): Promise<CustomerOrderSummary | null> {
  const row = await one<Record<string, unknown>>(
    sql,
    `SELECT id, payment_status, fulfillment_status, carrier, tracking_number, currency, total_minor, created_at
     FROM orders WHERE id = ? AND customer_id = ?`,
    [orderId, customerId],
  );

  if (!row || row.currency !== "USD") {
    return null;
  }

  return customerSummary(sql, row);
}

export function requestOrigin(value: string | undefined): string {
  const origin = value?.trim().replace(/\/$/, "") ?? "";

  if (!/^https?:\/\/[^\s/]+$/i.test(origin)) {
    return "";
  }

  return origin;
}

function trackingUrl(origin: string, token: string): string | null {
  return origin ? `${origin}/orders/t/${token}` : null;
}

async function orderIdForCommand(sql: Sql, command: WebhookCommand): Promise<string | null> {
  if (command.kind === "refunded") {
    const row = await one<{ id: string }>(sql, "SELECT id FROM orders WHERE stripe_payment_intent_id = ?", [command.paymentIntentId]);
    return row?.id ?? null;
  }

  const row = await one<{ id: string }>(sql, "SELECT id FROM orders WHERE stripe_session_id = ?", [command.sessionId]);
  return row?.id ?? null;
}

async function loadNoticeOrder(sql: Sql, orderId: string): Promise<{ email: string; paymentStatus: PaymentStatus; notice: OrderNotice } | null> {
  const row = await one<Record<string, unknown>>(
    sql,
    `SELECT email, payment_status, fulfillment_status, carrier, tracking_number, currency, total_minor
     FROM orders WHERE id = ?`,
    [orderId],
  );

  if (!row || row.currency !== "USD") {
    return null;
  }

  const lineOrder = sql.dialect === "postgres" ? "seq" : "rowid";
  const lines = await sql.query<Record<string, unknown>>(
    `SELECT product_name, variant_label, quantity, customization_json FROM order_lines WHERE order_id = ? ORDER BY ${lineOrder}`,
    [orderId],
  );

  return {
    email: String(row.email),
    paymentStatus: String(row.payment_status) as PaymentStatus,
    notice: {
      paymentStatus: String(row.payment_status),
      fulfillmentStatus: String(row.fulfillment_status),
      shipment: String(row.tracking_number).trim() ? "shipped" : "not-recorded",
      carrier: String(row.carrier),
      trackingNumber: String(row.tracking_number),
      lines: lines.map(readNoticeLine),
      totalLabel: formatMinorUnits(Number(row.total_minor), "USD"),
      trackingUrl: null,
    },
  };
}

async function customerSummary(sql: Sql, row: Record<string, unknown>): Promise<CustomerOrderSummary> {
  const lineOrder = sql.dialect === "postgres" ? "seq" : "rowid";
  const lines = await sql.query<Record<string, unknown>>(
    `SELECT product_name, variant_label, quantity, customization_json FROM order_lines WHERE order_id = ? ORDER BY ${lineOrder}`,
    [String(row.id)],
  );

  return {
    id: String(row.id),
    paymentStatus: String(row.payment_status) as PaymentStatus,
    fulfillmentStatus: String(row.fulfillment_status) as FulfillmentStatus,
    shipment: String(row.tracking_number).trim() ? "shipped" : "not-recorded",
    carrier: String(row.carrier),
    trackingNumber: String(row.tracking_number),
    currency: "USD",
    totalMinor: Number(row.total_minor),
    createdAt: String(row.created_at),
    lines: lines.map(readNoticeLine),
  };
}

function readNoticeLine(row: Record<string, unknown>): NoticeLine {
  return {
    productName: String(row.product_name),
    variantLabel: String(row.variant_label),
    quantity: Number(row.quantity),
    selections: selectionLabels(String(row.customization_json)),
  };
}

function selectionLabels(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as { groupLabel?: unknown; optionLabel?: unknown; detail?: unknown };
      const label = [record.groupLabel, record.optionLabel].filter((part) => typeof part === "string" && part.length > 0).join(": ");
      const detail = typeof record.detail === "string" && record.detail.length > 0 ? `${label} (${record.detail})` : label;
      return detail ? [detail] : [];
    });
  } catch {
    return [];
  }
}
