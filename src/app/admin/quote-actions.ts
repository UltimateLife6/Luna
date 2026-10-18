"use server";

import { connection } from "next/server";
import { quoteAdminAccess } from "@/lib/catalog-store/access";
import { CommerceError } from "@/lib/commerce/errors";
import { assertQuoteAdmin } from "@/lib/commerce/quotes";
import { updateQuoteRequest } from "@/lib/data/records";

export type FormState = { errors: string[] };

export async function updateQuoteAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  try {
    assertQuoteAdmin(await quoteAdminAccess());
    await updateQuoteRequest(text(formData, "id"), { status: text(formData, "status"), adminNote: text(formData, "adminNote") }, new Date());
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["The quote request was not updated."] };
  }

  return { errors: [] };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
