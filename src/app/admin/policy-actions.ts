"use server";

import { adminDenialMessage } from "@/lib/catalog-store/access";
import { updateStorePolicy } from "@/lib/data/records";

export type FormState = { errors: string[] };

export async function savePolicyAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  try {
    await updateStorePolicy(text(formData, "slug"), text(formData, "body"), formData.get("publish") === "1", new Date());
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "The policy was not saved."] };
  }

  return { errors: [] };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
