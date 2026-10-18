import { CommerceError } from "@/lib/commerce/errors";

export type ShippingAddress = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type WebhookCommand =
  | {
      kind: "paid";
      eventId: string;
      eventType: string;
      sessionId: string;
      paymentIntentId: string;
      email: string;
      shippingAmountMinor: number;
      taxMinor: number;
      amountTotalMinor: number;
      address: ShippingAddress;
    }
  | {
      kind: "expired";
      eventId: string;
      eventType: string;
      sessionId: string;
    }
  | {
      kind: "refunded";
      eventId: string;
      eventType: string;
      paymentIntentId: string;
    };

type StripeLikeEvent = {
  id?: string;
  type?: string;
  data?: { object?: unknown };
};

export function commandFromStripeEvent(event: StripeLikeEvent): WebhookCommand | null {
  const eventId = stringValue(event.id);
  const eventType = stringValue(event.type);
  const object = recordValue(event.data?.object);

  if (!eventId || !eventType || !object) {
    return null;
  }

  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    if (stringValue(object.payment_status) !== "paid") {
      return null;
    }

    const sessionId = stringValue(object.id);
    const paymentIntentId = idValue(object.payment_intent);
    const address = readAddress(object);
    const shippingAmountMinor = readShippingAmount(object);
    const taxMinor = readTax(object);
    const amountTotalMinor = integerValue(object.amount_total);

    if (!sessionId || !paymentIntentId || !address || shippingAmountMinor === null || amountTotalMinor === null) {
      throw new CommerceError(["The paid Checkout event was missing the session, shipping amount, address, or total."]);
    }

    return {
      kind: "paid",
      eventId,
      eventType,
      sessionId,
      paymentIntentId,
      email: readEmail(object),
      shippingAmountMinor,
      taxMinor,
      amountTotalMinor,
      address,
    };
  }

  if (eventType === "checkout.session.expired" || eventType === "checkout.session.async_payment_failed") {
    const sessionId = stringValue(object.id);

    if (!sessionId) {
      throw new CommerceError(["The Checkout event was missing a session id."]);
    }

    return { kind: "expired", eventId, eventType, sessionId };
  }

  if (eventType === "charge.refunded") {
    const paymentIntentId = idValue(object.payment_intent);

    if (!paymentIntentId) {
      throw new CommerceError(["The refund event was missing a payment intent."]);
    }

    return { kind: "refunded", eventId, eventType, paymentIntentId };
  }

  return null;
}

function readEmail(object: Record<string, unknown>): string {
  const customer = recordValue(object.customer_details);
  return stringValue(customer?.email) ?? "";
}

function readShippingAmount(object: Record<string, unknown>): number | null {
  const shippingCost = recordValue(object.shipping_cost);
  return integerValue(shippingCost?.amount_total);
}

function readTax(object: Record<string, unknown>): number {
  const totals = recordValue(object.total_details);
  return integerValue(totals?.amount_tax) ?? 0;
}

function readAddress(object: Record<string, unknown>): ShippingAddress | null {
  const shipping = recordValue(object.shipping_details) ?? recordValue(recordValue(object.collected_information)?.shipping_details);
  const address = recordValue(shipping?.address);
  const customer = recordValue(object.customer_details);
  const line1 = stringValue(address?.line1);
  const city = stringValue(address?.city);
  const country = stringValue(address?.country);

  if (!shipping || !line1 || !city || !country) {
    return null;
  }

  return {
    name: stringValue(shipping.name) ?? stringValue(customer?.name) ?? "",
    line1,
    line2: stringValue(address?.line2) ?? "",
    city,
    region: stringValue(address?.state) ?? "",
    postalCode: stringValue(address?.postal_code) ?? "",
    country,
  };
}

function idValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return stringValue(recordValue(value)?.id);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}
