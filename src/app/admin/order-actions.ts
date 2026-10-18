"use server";

import { adminDenialMessage } from "@/lib/catalog-store/access";
import { CommerceError } from "@/lib/commerce/errors";
import { fulfillmentStatuses, type FulfillmentStatus } from "@/lib/commerce/policy";
import { parseCountryList } from "@/lib/commerce/store";
import { rotateOrderTracking, saveOrderShipment, saveShippingRate, setShippingRateActive, updateFulfillment } from "@/lib/data/records";

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

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
