"use server";

import { revalidatePath } from "next/cache";
import { adminDenialMessage } from "@/lib/catalog-store/access";
import { CommerceError } from "@/lib/commerce/errors";
import { fulfillmentStatuses, type FulfillmentStatus } from "@/lib/commerce/policy";
import { parseCountryList } from "@/lib/commerce/store";
import { recheckCheckoutReservation, rotateOrderTracking, saveOrderShipment, saveShippingRate, setShippingRateActive, updateFulfillment } from "@/lib/data/records";

export type FormState = { errors: string[]; notice?: string };

export async function saveShippingRateAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  try {
    const amount = text(formData, "amountMinor");

    if (!/^\d+$/.test(amount)) {
      return { errors: ["Enter the shipping amount as a whole number of minor units."] };
    }

    await saveShippingRate(
      {
        label: text(formData, "label"),
        amountMinor: Number(amount),
        countries: parseCountryList(text(formData, "countries")),
      },
      new Date(),
    );
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["The shipping rate was not saved."] };
  }

  return { errors: [] };
}

export async function setShippingRateActiveAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  try {
    await setShippingRateActive(text(formData, "id"), formData.get("active") === "1");
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["The shipping rate was not updated."] };
  }

  return { errors: [] };
}

export async function updateFulfillmentAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const status = text(formData, "fulfillment");

  if (!fulfillmentStatuses.some((value) => value === status)) {
    return { errors: ["Choose a fulfillment status."] };
  }

  try {
    await updateFulfillment(text(formData, "orderId"), status as FulfillmentStatus, new Date());
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["Fulfillment was not updated."] };
  }

  return { errors: [] };
}

export async function saveShipmentAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  try {
    await saveOrderShipment(text(formData, "orderId"), { carrier: text(formData, "carrier"), trackingNumber: text(formData, "trackingNumber") }, new Date());
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["Tracking was not saved."] };
  }

  return { errors: [] };
}

export async function rotateTrackingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  try {
    const token = await rotateOrderTracking(text(formData, "orderId"), new Date());
    return { errors: [], notice: `Copy this tracking link now. It is not stored: /orders/t/${token}` };
  } catch {
    return { errors: ["The tracking link was not rotated."] };
  }
}

export async function recheckReservationAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const orderId = text(formData, "orderId");

  try {
    const result = await recheckCheckoutReservation(orderId, new Date());
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { errors: [], notice: reviewNotice(result.outcome, result.detail) };
  } catch (error) {
    return { errors: error instanceof CommerceError ? error.errors : ["Stripe could not be read. The finished piece stays reserved."] };
  }
}

function reviewNotice(outcome: string, detail: string): string {
  if (outcome === "released") {
    return "Stripe shows this Checkout cannot still be paid. The reservation was released.";
  }

  if (outcome === "skipped") {
    return "This order is not a pending Checkout reservation. Inventory was not released.";
  }

  if (detail === "hold:paid") {
    return "Stripe shows a paid Checkout. The piece stays reserved until the verified webhook records it.";
  }

  if (detail === "hold:processing") {
    return "Stripe shows the payment is still processing. The piece stays reserved.";
  }

  if (detail === "hold:open") {
    return "Stripe still shows an open Checkout session. The piece stays reserved.";
  }

  return "Stripe did not confirm that payment cannot complete. The finished piece stays reserved.";
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
