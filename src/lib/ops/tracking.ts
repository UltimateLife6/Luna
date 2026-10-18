import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { FulfillmentStatus, PaymentStatus } from "@/lib/commerce/policy";
import { integer, one, type Sql } from "@/lib/platform/sql";

export const trackingWindowMs = 15 * 60 * 1000;
export const trackingAttemptLimit = 20;
export const quoteAttemptLimit = 8;
export const accountAttemptLimit = 8;
export const signInAttemptLimit = 30;
export const publicOrderColumns = [
  "o.payment_status",
  "o.fulfillment_status",
  "o.carrier",
  "o.tracking_number",
  "o.shipped_at",
  "o.currency",
  "o.subtotal_minor",
  "o.total_minor",
  "o.shipping_label",
  "o.shipping_amount_minor",
  "o.created_at",
] as const;

export type PublicOrderLine = {
  productName: string;
  variantLabel: string;
  quantity: number;
  selections: string[];
};

export type PublicOrderStatus = {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shipment: "shipped" | "not-recorded";
  carrier: string;
  trackingNumber: string;
  currency: "USD";
  subtotalMinor: number;
  shippingLabel: string;
  shippingAmountMinor: number | null;
  totalMinor: number;
  createdAt: string;
  lines: PublicOrderLine[];
};

export type TrackingLookup =
  | { status: "limited"; message: string }
  | { status: "missing"; message: string }
  | { status: "found"; order: PublicOrderStatus };

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const missingMessage = "No order matches this tracking link.";

export function trackingSubject(ip: string): string {
  return createHash("sha256").update(`tracking:${ip || "unknown"}`).digest("hex");
}

export function hashTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueTrackingToken(sql: Sql, orderId: string, now: Date): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql.execute("INSERT INTO order_tracking_tokens (id, order_id, token_hash, created_at, revoked_at) VALUES (?, ?, ?, ?, NULL)", [
    randomUUID(),
    orderId,
    hashTrackingToken(token),
    now.toISOString(),
  ]);
  await addOrderEvent(sql, orderId, "tracking-token", "A tracking link was issued.", now);
  return token;
}

export async function trackingHintMatchesOrder(sql: Sql, token: string, orderId: string): Promise<boolean> {
  if (!tokenPattern.test(token)) {
    return false;
  }

  const row = await one<{ id: string }>(
    sql,
    "SELECT id FROM order_tracking_tokens WHERE token_hash = ? AND order_id = ? AND revoked_at IS NULL",
    [hashTrackingToken(token), orderId],
  );
  return Boolean(row);
}

export async function rotateTrackingToken(sql: Sql, orderId: string, now: Date): Promise<string> {
  await sql.execute("UPDATE order_tracking_tokens SET revoked_at = ? WHERE order_id = ? AND revoked_at IS NULL", [now.toISOString(), orderId]);
  await addOrderEvent(sql, orderId, "tracking-token", "Tracking links were revoked and a new link was issued.", now);
  return issueTrackingToken(sql, orderId, now);
}

export async function lookupPublicOrder(sql: Sql, token: string, subjectHash: string, now: Date): Promise<TrackingLookup> {
  if (await trackingLimited(sql, subjectHash, now)) {
    return { status: "limited", message: "Too many tracking attempts. Wait and try again." };
  }

  await sql.execute("INSERT INTO tracking_attempts (id, subject_hash, attempted_at) VALUES (?, ?, ?)", [
    randomUUID(),
    subjectHash,
    now.toISOString(),
  ]);

  if (!tokenPattern.test(token)) {
    return { status: "missing", message: missingMessage };
  }

  const row = await one<Record<string, unknown>>(
    sql,
    `SELECT o.id, ${publicOrderColumns.join(", ")}
     FROM order_tracking_tokens t
     JOIN orders o ON o.id = t.order_id
     WHERE t.token_hash = ? AND t.revoked_at IS NULL`,
    [hashTrackingToken(token)],
  );

  if (!row || row.currency !== "USD") {
    return { status: "missing", message: missingMessage };
  }

  const lineOrder = sql.dialect === "postgres" ? "seq" : "rowid";
  const lines = await sql.query<Record<string, unknown>>(
    `SELECT product_name, variant_label, quantity, customization_json
     FROM order_lines WHERE order_id = ? ORDER BY ${lineOrder}`,
    [String(row.id)],
  );

  return {
    status: "found",
    order: {
      paymentStatus: String(row.payment_status) as PaymentStatus,
      fulfillmentStatus: String(row.fulfillment_status) as FulfillmentStatus,
      shipment: String(row.tracking_number).trim() ? "shipped" : "not-recorded",
      carrier: String(row.carrier),
      trackingNumber: String(row.tracking_number),
      currency: "USD",
      subtotalMinor: Number(row.subtotal_minor),
      shippingLabel: String(row.shipping_label),
      shippingAmountMinor: row.shipping_amount_minor === null || row.shipping_amount_minor === undefined ? null : Number(row.shipping_amount_minor),
      totalMinor: Number(row.total_minor),
      createdAt: String(row.created_at),
      lines: lines.map(readPublicLine),
    },
  };
}

export async function addOrderEvent(sql: Sql, orderId: string, kind: string, detail: string, now: Date): Promise<void> {
  await sql.execute("INSERT INTO order_events (id, order_id, kind, detail, created_at) VALUES (?, ?, ?, ?, ?)", [
    randomUUID(),
    orderId,
    kind,
    detail.slice(0, 240),
    now.toISOString(),
  ]);
}

export async function attemptAllowed(sql: Sql, subjectHash: string, now: Date, limit: number): Promise<boolean> {
  return (await recentAttempts(sql, subjectHash, now)) < limit;
}

export async function recordAttempt(sql: Sql, subjectHash: string, now: Date): Promise<void> {
  await sql.execute("INSERT INTO tracking_attempts (id, subject_hash, attempted_at) VALUES (?, ?, ?)", [
    randomUUID(),
    subjectHash,
    now.toISOString(),
  ]);
}

async function trackingLimited(sql: Sql, subjectHash: string, now: Date): Promise<boolean> {
  return (await recentAttempts(sql, subjectHash, now)) >= trackingAttemptLimit;
}

async function recentAttempts(sql: Sql, subjectHash: string, now: Date): Promise<number> {
  const row = await one<{ attempts: unknown }>(
    sql,
    "SELECT COUNT(*) AS attempts FROM tracking_attempts WHERE subject_hash = ? AND attempted_at > ?",
    [subjectHash, new Date(now.getTime() - trackingWindowMs).toISOString()],
  );

  return integer(row?.attempts);
}

function readPublicLine(row: Record<string, unknown>): PublicOrderLine {
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
