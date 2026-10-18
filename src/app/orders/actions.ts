"use server";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentTrackingSubject } from "@/lib/ops/client-subject";
import { lookupTrackedOrder } from "@/lib/data/records";

export type TrackingFormState = { errors: string[] };

export async function openTrackingAction(_state: TrackingFormState, formData: FormData): Promise<TrackingFormState> {
  await connection();
  const token = text(formData, "token");
  const result = await lookupTrackedOrder(token, await currentTrackingSubject(), new Date());

  if (result.status === "found") {
    redirect(`/orders/t/${token}`);
  }

  return { errors: [result.message] };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
