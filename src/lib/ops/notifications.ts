import { randomUUID } from "node:crypto";
import { emailConfiguration, type EmailConfiguration } from "@/lib/platform/env";
import { one, type Sql } from "@/lib/platform/sql";

export type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type EmailSender = {
  send(message: OutboundEmail): Promise<{ providerMessageId: string }>;
};

export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type DeliveryRecord = {
  id: string;
  kind: string;
  recipient: string;
  relatedId: string;
  status: DeliveryStatus;
  attempts: number;
  lastError: string;
  updatedAt: string;
};

const retryLimit = 5;

export async function dispatchNotification(
  sql: Sql,
  input: { idempotencyKey: string; kind: string; recipient: string; relatedId: string; message: Omit<OutboundEmail, "to" | "idempotencyKey"> | null },
  sender: EmailSender | null,
  now: Date,
): Promise<DeliveryRecord> {
  const existing = await readDelivery(sql, input.idempotencyKey);

  if (existing?.status === "sent") {
    return existing;
  }

  if (existing && existing.attempts >= retryLimit && existing.status === "failed") {
    return existing;
  }

  const id = existing?.id ?? randomUUID();
  const timestamp = now.toISOString();

  if (!existing) {
    await sql.execute(
      `INSERT INTO notification_deliveries (
         id, idempotency_key, kind, recipient, related_id, status, attempts, last_error, provider_message_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'pending', 0, '', '', ?, ?)`,
      [id, input.idempotencyKey, input.kind, input.recipient, input.relatedId, timestamp, timestamp],
    );
  }

  if (!sender || !input.message || !input.recipient.includes("@")) {
    await sql.execute("UPDATE notification_deliveries SET status = 'skipped', last_error = ?, updated_at = ? WHERE id = ?", [
      input.recipient.includes("@") ? "Email delivery is not configured." : "No recipient is saved.",
      timestamp,
      id,
    ]);
    return requiredDelivery(sql, input.idempotencyKey);
  }

  const attempts = (existing?.attempts ?? 0) + 1;
  await sql.execute("UPDATE notification_deliveries SET status = 'pending', attempts = ?, updated_at = ? WHERE id = ?", [attempts, timestamp, id]);

  try {
    const result = await sender.send({
      to: input.recipient,
      subject: input.message.subject,
      text: input.message.text,
      html: input.message.html,
      idempotencyKey: input.idempotencyKey,
    });
    await sql.execute(
      "UPDATE notification_deliveries SET status = 'sent', last_error = '', provider_message_id = ?, updated_at = ? WHERE id = ?",
      [result.providerMessageId.slice(0, 120), timestamp, id],
    );
  } catch {
    await sql.execute("UPDATE notification_deliveries SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?", [
      "Delivery failed.",
      timestamp,
      id,
    ]);
  }

  return requiredDelivery(sql, input.idempotencyKey);
}

export async function listDeliveries(sql: Sql, relatedId: string): Promise<DeliveryRecord[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT id, kind, recipient, related_id, status, attempts, last_error, updated_at
     FROM notification_deliveries WHERE related_id = ? ORDER BY created_at`,
    [relatedId],
  );

  return rows.map(readRow);
}

export function senderFromEnv(source: Record<string, string | undefined> = process.env): EmailSender | null {
  const configuration = emailConfiguration(source);
  return configuration.enabled ? createEmailSender(configuration) : null;
}

export function createEmailSender(configuration: Extract<EmailConfiguration, { enabled: true }>): EmailSender {
  return {
    async send(message) {
      if (configuration.provider === "resend") {
        return sendResend(configuration.apiKey, configuration.from, message);
      }

      return sendSendGrid(configuration.apiKey, configuration.from, message);
    },
  };
}

async function sendResend(apiKey: string, from: string, message: OutboundEmail): Promise<{ providerMessageId: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    throw new Error("Delivery failed.");
  }

  const payload = (await response.json()) as { id?: string };
  return { providerMessageId: payload.id ?? "" };
}

async function sendSendGrid(apiKey: string, from: string, message: OutboundEmail): Promise<{ providerMessageId: string }> {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: message.to }] }],
      from: { email: from },
      subject: message.subject,
      content: [
        { type: "text/plain", value: message.text },
        { type: "text/html", value: message.html },
      ],
      custom_args: { idempotency_key: message.idempotencyKey },
    }),
  });

  if (!response.ok) {
    throw new Error("Delivery failed.");
  }

  return { providerMessageId: response.headers.get("x-message-id") ?? "" };
}

async function readDelivery(sql: Sql, idempotencyKey: string): Promise<DeliveryRecord | null> {
  const row = await one<Record<string, unknown>>(
    sql,
    `SELECT id, kind, recipient, related_id, status, attempts, last_error, updated_at
     FROM notification_deliveries WHERE idempotency_key = ?`,
    [idempotencyKey],
  );

  return row ? readRow(row) : null;
}

async function requiredDelivery(sql: Sql, idempotencyKey: string): Promise<DeliveryRecord> {
  const delivery = await readDelivery(sql, idempotencyKey);

  if (!delivery) {
    throw new Error("The notification record was not saved.");
  }

  return delivery;
}

function readRow(row: Record<string, unknown>): DeliveryRecord {
  return {
    id: String(row.id),
    kind: String(row.kind),
    recipient: String(row.recipient),
    relatedId: String(row.related_id),
    status: String(row.status) as DeliveryStatus,
    attempts: Number(row.attempts),
    lastError: String(row.last_error),
    updatedAt: String(row.updated_at),
  };
}
