import { randomUUID } from "node:crypto";
import { CommerceError } from "@/lib/commerce/errors";
import { quoteStatuses, type QuoteRequest, type QuoteStatus } from "@/lib/commerce/quotes";
import { getCatalogProduct } from "@/lib/platform/catalog-repo";
import { one, type Sql } from "@/lib/platform/sql";

export async function createQuoteRequest(
  sql: Sql,
  input: { productId: string; contactName: string; email: string; details: string },
  now: Date,
): Promise<QuoteRequest> {
  const product = await getCatalogProduct(sql, input.productId);

  if (!product || product.status !== "published" || product.purchaseMode !== "quote-only") {
    throw new CommerceError(["Quote requests are only saved for published quote-only records."]);
  }

  const contactName = input.contactName.trim();
  const email = input.email.trim();
  const details = input.details.trim();

  if (contactName.length < 1 || contactName.length > 80) {
    throw new CommerceError(["Enter a name of 80 characters or fewer."]);
  }

  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CommerceError(["Enter an email address."]);
  }

  if (details.length < 10 || details.length > 2000) {
    throw new CommerceError(["Describe the request in 10 to 2000 characters. No price or production date is assigned here."]);
  }

  const quote: QuoteRequest = {
    id: randomUUID(),
    productId: product.id,
    productName: product.name,
    contactName,
    email,
    details,
    status: "received",
    adminNote: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await sql.execute(
    `INSERT INTO quote_requests (
       id, product_id, product_name, contact_name, email, details, status, admin_note, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'received', '', ?, ?)`,
    [quote.id, quote.productId, quote.productName, quote.contactName, quote.email, quote.details, quote.createdAt, quote.updatedAt],
  );

  return quote;
}

export async function listQuoteRequests(sql: Sql): Promise<QuoteRequest[]> {
  const rows = await sql.query<Record<string, unknown>>("SELECT * FROM quote_requests ORDER BY created_at DESC");
  return rows.map(readQuote);
}

export async function getQuoteRequest(sql: Sql, id: string): Promise<QuoteRequest | null> {
  const row = await one<Record<string, unknown>>(sql, "SELECT * FROM quote_requests WHERE id = ?", [id]);
  return row ? readQuote(row) : null;
}

export async function updateQuoteRequest(sql: Sql, id: string, input: { status: string; adminNote: string }, now: Date): Promise<void> {
  if (!quoteStatuses.some((status) => status === input.status)) {
    throw new CommerceError(["Choose received, reviewing, or closed."]);
  }

  const adminNote = input.adminNote.trim();

  if (adminNote.length > 500) {
    throw new CommerceError(["Keep the internal note to 500 characters or fewer."]);
  }

  const result = await sql.execute("UPDATE quote_requests SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?", [input.status, adminNote, now.toISOString(), id]);

  if (result.changes !== 1) {
    throw new CommerceError(["That quote request was not found."]);
  }
}

function readQuote(row: Record<string, unknown>): QuoteRequest {
  return {
    id: String(row.id),
    productId: row.product_id ? String(row.product_id) : null,
    productName: String(row.product_name),
    contactName: String(row.contact_name),
    email: String(row.email),
    details: String(row.details),
    status: String(row.status) as QuoteStatus,
    adminNote: String(row.admin_note),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
