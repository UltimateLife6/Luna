import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { AdminAccess } from "@/lib/catalog-store/auth";
import { getCatalogProduct } from "@/lib/catalog-store/products";
import { CommerceError } from "@/lib/commerce/errors";

export const quoteStatuses = ["received", "reviewing", "closed"] as const;

export type QuoteStatus = (typeof quoteStatuses)[number];

export type QuoteRequest = {
  id: string;
  productId: string | null;
  productName: string;
  contactName: string;
  email: string;
  details: string;
  status: QuoteStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export function assertQuoteAdmin(access: AdminAccess): void {
  if (access !== "ready") {
    throw new CommerceError([access === "anonymous" ? "Sign in to the local catalog admin." : "Catalog admin is closed."]);
  }
}

export function createQuoteRequest(
  database: DatabaseSync,
  input: { productId: string; contactName: string; email: string; details: string },
  now: Date,
): QuoteRequest {
  const product = getCatalogProduct(database, input.productId);

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

  database
    .prepare(
      `INSERT INTO quote_requests (
         id, product_id, product_name, contact_name, email, details, status, admin_note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'received', '', ?, ?)`,
    )
    .run(quote.id, quote.productId, quote.productName, quote.contactName, quote.email, quote.details, quote.createdAt, quote.updatedAt);

  return quote;
}

export function listQuoteRequests(database: DatabaseSync): QuoteRequest[] {
  return (database.prepare("SELECT * FROM quote_requests ORDER BY created_at DESC").all() as Record<string, string>[]).map(readQuote);
}

export function getQuoteRequest(database: DatabaseSync, id: string): QuoteRequest | null {
  const row = database.prepare("SELECT * FROM quote_requests WHERE id = ?").get(id) as Record<string, string> | undefined;
  return row ? readQuote(row) : null;
}

export function updateQuoteRequest(
  database: DatabaseSync,
  id: string,
  input: { status: string; adminNote: string },
  now: Date,
): void {
  if (!quoteStatuses.some((status) => status === input.status)) {
    throw new CommerceError(["Choose received, reviewing, or closed."]);
  }

  const adminNote = input.adminNote.trim();

  if (adminNote.length > 500) {
    throw new CommerceError(["Keep the internal note to 500 characters or fewer."]);
  }

  const result = database
    .prepare("UPDATE quote_requests SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?")
    .run(input.status, adminNote, now.toISOString(), id);

  if (result.changes !== 1) {
    throw new CommerceError(["That quote request was not found."]);
  }
}

function readQuote(row: Record<string, string>): QuoteRequest {
  return {
    id: row.id,
    productId: row.product_id || null,
    productName: row.product_name,
    contactName: row.contact_name,
    email: row.email,
    details: row.details,
    status: row.status as QuoteStatus,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
