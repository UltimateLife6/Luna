/** Stripe Checkout's shortest session is 30 minutes. One extra minute keeps the requested session expiry inside that rule. */
export const holdMs = 31 * 60 * 1000;

/** Stripe accepts a Checkout `expires_at` from 30 minutes through 24 hours after creation. */
export const stripeCheckoutMinMs = 30 * 60 * 1000;
export const stripeCheckoutMaxMs = 24 * 60 * 60 * 1000;

/** After this long, an unresolved Checkout reservation is marked for manual review. It is not released automatically. */
export const sessionPaymentGraceMs = 72 * 60 * 60 * 1000;

/** Reconciliation detail that stops automatic Stripe reads and keeps the piece reserved. */
export const manualReviewDetail = "hold:manual-review";

/** Keeps a reviewed reservation counted by any query that still checks expires_at. */
export const manualReviewHoldUntil = "9999-12-31T00:00:00.000Z";

export const checkoutClosedHoldDetail =
  "Stripe closed this Checkout session. The finished piece stays reserved until Stripe shows that payment cannot still complete.";

export const latePaymentShortageDetail =
  "Payment was recorded after the reservation window ended. Finished inventory could not be deducted. Refund this charge in the Stripe Dashboard. This order does not authorize a second sale of the same piece.";

export const latePaymentRecoveredDetail = "Payment was recorded after the reservation window ended. The reserved piece was deducted.";

export function checkoutExpiresAt(now: Date): Date {
  const expiresAt = new Date(now.getTime() + holdMs);
  const span = expiresAt.getTime() - now.getTime();

  if (span < stripeCheckoutMinMs || span > stripeCheckoutMaxMs) {
    throw new Error("The checkout hold is outside Stripe's 30-minute to 24-hour session window.");
  }

  return expiresAt;
}

export function reservationCountedUntil(checkoutExpiry: Date): Date {
  return new Date(checkoutExpiry.getTime() + sessionPaymentGraceMs);
}

export function expiredPendingOrdersStatement(): string {
  return `SELECT id FROM orders
    WHERE payment_status = 'pending'
    AND stripe_session_id IS NULL
    AND expires_at <= ?`;
}

export function unresolvedCheckoutStatement(): string {
  return `SELECT id FROM orders
    WHERE payment_status = 'pending'
    AND stripe_session_id IS NOT NULL
    AND expires_at <= ?
    AND NOT EXISTS (
      SELECT 1 FROM order_events
      WHERE order_events.order_id = orders.id
      AND order_events.kind = 'reconciliation'
      AND order_events.detail = ?
    )`;
}

export function countedReservationPredicate(): string {
  return `status = 'reserved' AND (
    expires_at > ?
    OR order_id IN (SELECT id FROM orders WHERE stripe_session_id IS NOT NULL AND payment_status = 'pending')
  )`;
}

export const madeToOrderQuantityCap = 99;

export type CheckoutConfigInput = {
  secretKey?: string;
  webhookSecret?: string;
  shippingRates: { countries: readonly string[] }[];
};

export function checkoutBlockers(input: CheckoutConfigInput): string[] {
  const blockers: string[] = [];
  const secretKey = input.secretKey?.trim() ?? "";
  const webhookSecret = input.webhookSecret?.trim() ?? "";

  if (!secretKey) {
    blockers.push("Stripe test secret key is not set.");
  } else if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) {
    blockers.push("A live Stripe key was found. Live payments stay off.");
  } else if (!secretKey.startsWith("sk_test_")) {
    blockers.push("Stripe secret key must be a test key beginning with sk_test_.");
  }

  if (!webhookSecret) {
    blockers.push("Stripe webhook signing secret is not set.");
  } else if (!webhookSecret.startsWith("whsec_")) {
    blockers.push("Stripe webhook signing secret must begin with whsec_.");
  }

  if (input.shippingRates.length < 1) {
    blockers.push("No active shipping rate is saved. Checkout stays off until one is entered.");
  } else if (input.shippingRates.length > 5) {
    blockers.push("Stripe Checkout accepts at most five active shipping rates.");
  } else if (new Set(input.shippingRates.map((rate) => [...rate.countries].sort().join(","))).size > 1) {
    blockers.push("Active shipping rates must list the same countries.");
  }

  return blockers;
}

export function readStripeSecret(): string | undefined {
  const value = process.env["STRIPE_SECRET_KEY"];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function readWebhookSecret(): string | undefined {
  const value = process.env["STRIPE_WEBHOOK_SECRET"];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}
