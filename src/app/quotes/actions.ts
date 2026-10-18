"use server";

import { connection } from "next/server";
import { CommerceError } from "@/lib/commerce/errors";
import { createQuoteRequest } from "@/lib/data/records";
import { currentClientAddress } from "@/lib/ops/client-subject";
import { attemptAllowed, quoteAttemptLimit, recordAttempt, trackingSubject } from "@/lib/ops/tracking";
import { applicationSql } from "@/lib/platform/runtime";

export type FormState = { errors: string[]; saved: boolean };

export async function submitQuoteAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  const now = new Date();
  const subject = trackingSubject(`quote:${await currentClientAddress()}`);
  const sql = await applicationSql();

  if (!(await attemptAllowed(sql, subject, now, quoteAttemptLimit))) {
    return { errors: ["Too many quote requests. Wait and try again."], saved: false };
  }

  await recordAttempt(sql, subject, now);

  try {
    await createQuoteRequest(
      {
        productId: text(formData, "productId"),
        contactName: text(formData, "contactName"),
        email: text(formData, "email"),
        details: text(formData, "details"),
      },
      new Date(),
    );
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["The quote request was not saved."], saved: false };
  }

  return { errors: [], saved: true };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
