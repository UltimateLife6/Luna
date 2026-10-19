import { manualReviewDetail } from "@/lib/commerce/config";

/** How often a hosted cron should call the reconcile route. Also the minimum gap between Stripe reads for one order. */
export const reconciliationRetryMs = 15 * 60 * 1000;

/** Failed or uncertain Stripe reads stop after this many attempts and wait for an admin recheck. */
export const reconciliationAttemptLimit = 5;

export const reconciliationFailureDetails = ["hold:api-failure", "hold:uncertain"] as const;

const failureDetails = new Set<string>(reconciliationFailureDetails);
const holdingIntents = new Set(["succeeded", "processing", "requires_action", "requires_confirmation", "requires_capture"]);
const failedIntents = new Set(["canceled", "requires_payment_method"]);

export type PaymentObservation = {
  sessionStatus: "open" | "complete" | "expired" | "unknown";
  paymentStatus: "paid" | "unpaid" | "no_payment_required" | "unknown";
  paymentIntentStatus: "succeeded" | "processing" | "requires_action" | "requires_confirmation" | "requires_capture" | "requires_payment_method" | "canceled" | "unknown" | null;
};

export type ReservationDecision = { action: "release" | "hold"; reason: string };

export type ReservationCandidate = {
  orderId: string;
  sessionId: string;
  failures: number;
  lastAttemptAt: string | null;
};

export type ReservationBook = {
  listCandidates(now: Date): Promise<readonly ReservationCandidate[]>;
  apply(orderId: string, action: "release" | "hold", detail: string, now: Date): Promise<"released" | "held" | "skipped">;
};

export type ReconcileSummary = {
  checked: number;
  released: number;
  held: number;
  deferred: number;
  skipped: number;
};

export type ReviewResult = {
  outcome: "released" | "held" | "skipped" | "unavailable";
  detail: string;
};

export function reservationDecision(observation: PaymentObservation): ReservationDecision {
  if (observation.sessionStatus === "unknown" || observation.paymentStatus === "unknown" || observation.paymentIntentStatus === "unknown") {
    return { action: "hold", reason: "uncertain" };
  }

  if (observation.sessionStatus === "open") {
    return { action: "hold", reason: "open" };
  }

  if (observation.paymentStatus === "paid" || observation.paymentIntentStatus === "succeeded") {
    return { action: "hold", reason: "paid" };
  }

  if (observation.paymentStatus === "no_payment_required") {
    return { action: "hold", reason: "uncertain" };
  }

  if (observation.paymentIntentStatus && holdingIntents.has(observation.paymentIntentStatus)) {
    return { action: "hold", reason: "processing" };
  }

  if (observation.sessionStatus === "expired" && observation.paymentStatus === "unpaid") {
    if (observation.paymentIntentStatus === null || failedIntents.has(observation.paymentIntentStatus)) {
      return { action: "release", reason: "expired" };
    }
  }

  if (
    observation.sessionStatus === "complete" &&
    observation.paymentStatus === "unpaid" &&
    observation.paymentIntentStatus !== null &&
    failedIntents.has(observation.paymentIntentStatus)
  ) {
    return { action: "release", reason: "canceled" };
  }

  return { action: "hold", reason: "uncertain" };
}

export function reconciliationDetail(decision: ReservationDecision): string {
  return `${decision.action}:${decision.reason}`;
}

export async function reconcileReservations(
  book: ReservationBook,
  now: Date,
  readPayment: (sessionId: string) => Promise<PaymentObservation>,
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { checked: 0, released: 0, held: 0, deferred: 0, skipped: 0 };
  const candidates = await book.listCandidates(now);

  for (const candidate of candidates) {
    if (candidate.failures >= reconciliationAttemptLimit) {
      await book.apply(candidate.orderId, "hold", manualReviewDetail, now);
      summary.deferred += 1;
      continue;
    }

    if (withinRetry(candidate.lastAttemptAt, now)) {
      summary.deferred += 1;
      continue;
    }

    let decision: ReservationDecision;

    try {
      summary.checked += 1;
      decision = reservationDecision(await readPayment(candidate.sessionId));
    } catch {
      decision = { action: "hold", reason: "api-failure" };
    }

    const outcome = await book.apply(candidate.orderId, decision.action, reconciliationDetail(decision), now);

    if (outcome === "released") {
      summary.released += 1;
    } else if (outcome === "held") {
      summary.held += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return summary;
}

export function countsAsReconciliationFailure(detail: string): boolean {
  return failureDetails.has(detail);
}

export async function reviewCheckoutReservation(
  order: { orderId: string; sessionId: string | null; paymentStatus: string },
  now: Date,
  readPayment: (sessionId: string) => Promise<PaymentObservation>,
  apply: ReservationBook["apply"],
): Promise<ReviewResult> {
  if (order.paymentStatus !== "pending" || !order.sessionId) {
    return { outcome: "skipped", detail: order.paymentStatus };
  }

  try {
    const decision = reservationDecision(await readPayment(order.sessionId));
    const detail = reconciliationDetail(decision);
    const outcome = await apply(order.orderId, decision.action, detail, now);

    if (outcome !== "skipped" && decision.action === "hold" && countsAsReconciliationFailure(detail)) {
      await apply(order.orderId, "hold", manualReviewDetail, now);
    }

    return { outcome, detail };
  } catch {
    await apply(order.orderId, "hold", "hold:api-failure", now);
    await apply(order.orderId, "hold", manualReviewDetail, now);
    return { outcome: "unavailable", detail: "hold:api-failure" };
  }
}

function withinRetry(lastAttemptAt: string | null, now: Date): boolean {
  if (!lastAttemptAt) {
    return false;
  }

  const then = Date.parse(lastAttemptAt);

  if (Number.isNaN(then)) {
    return false;
  }

  return now.getTime() - then < reconciliationRetryMs;
}
