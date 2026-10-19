import Stripe from "stripe";
import { CommerceError } from "@/lib/commerce/errors";
import type { PaymentObservation } from "@/lib/commerce/reconciliation";

export function verifyWebhook(payload: string, signature: string, secret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function createCheckoutSession(
  secretKey: string,
  params: Stripe.Checkout.SessionCreateParams,
): Promise<{ id: string; url: string }> {
  assertTestKey(secretKey);
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    throw new CommerceError(["Stripe did not return a Checkout URL."]);
  }

  return { id: session.id, url: session.url };
}

export type CheckoutSessionView = {
  status: "open" | "complete" | "expired" | "unknown";
  url: string | null;
};

export async function readCheckoutSession(secretKey: string, sessionId: string): Promise<CheckoutSessionView> {
  assertTestKey(secretKey);
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return { status: checkoutSessionStatus(session.status), url: session.url ?? null };
}

export async function readCheckoutPayment(secretKey: string, sessionId: string): Promise<PaymentObservation> {
  assertTestKey(secretKey);
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const paymentIntent = session.payment_intent;

  return {
    sessionStatus: checkoutSessionStatus(session.status),
    paymentStatus: checkoutPaymentStatus(session.payment_status),
    paymentIntentStatus: intentStatus(typeof paymentIntent === "object" && paymentIntent ? paymentIntent.status : null),
  };
}

export async function expireOpenCheckoutSession(secretKey: string, sessionId: string): Promise<void> {
  assertTestKey(secretKey);
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.status === "open") {
    await stripe.checkout.sessions.expire(sessionId);
  }
}

function checkoutPaymentStatus(value: string | null | undefined): PaymentObservation["paymentStatus"] {
  if (value === "paid" || value === "unpaid" || value === "no_payment_required") {
    return value;
  }

  return "unknown";
}

function intentStatus(value: string | null | undefined): PaymentObservation["paymentIntentStatus"] {
  if (
    value === "succeeded" ||
    value === "processing" ||
    value === "requires_action" ||
    value === "requires_confirmation" ||
    value === "requires_capture" ||
    value === "requires_payment_method" ||
    value === "canceled"
  ) {
    return value;
  }

  return value ? "unknown" : null;
}

function checkoutSessionStatus(value: string | null | undefined): CheckoutSessionView["status"] {
  if (value === "open" || value === "complete" || value === "expired") {
    return value;
  }

  return "unknown";
}

function assertTestKey(secretKey: string): void {
  if (!secretKey.startsWith("sk_test_")) {
    throw new CommerceError(["Stripe test mode is required. Live payments stay off."]);
  }
}
