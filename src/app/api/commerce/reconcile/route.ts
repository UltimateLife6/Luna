import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { readStripeSecret } from "@/lib/commerce/config";
import { readCheckoutPayment } from "@/lib/commerce/stripe";
import { reconcileCheckoutReservations } from "@/lib/data/records";
import { assertStripeTestConfiguration } from "@/lib/platform/env";
import { logError } from "@/lib/platform/log";

export async function GET(request: Request) {
  return reconcile(request);
}

export async function POST(request: Request) {
  return reconcile(request);
}

async function reconcile(request: Request) {
  await connection();
  const expected = process.env.CRON_SECRET?.trim() ?? "";

  if (!expected) {
    return Response.json({ error: "Reconciliation is closed until CRON_SECRET is set." }, { status: 503 });
  }

  if (!authorized(request, expected)) {
    return Response.json({ error: "Reconciliation is closed." }, { status: 401 });
  }

  const secretKey = readStripeSecret();

  try {
    assertStripeTestConfiguration(secretKey);
  } catch (error) {
    logError("reservation-reconcile", error);
    return Response.json({ error: "Live payments stay off." }, { status: 503 });
  }

  if (!secretKey) {
    return Response.json({ error: "Stripe test secret key is not set." }, { status: 503 });
  }

  try {
    const summary = await reconcileCheckoutReservations(new Date(), (sessionId) => readCheckoutPayment(secretKey, sessionId));
    return Response.json(summary);
  } catch (error) {
    logError("reservation-reconcile", error);
    return Response.json({ error: "Reconciliation did not finish." }, { status: 500 });
  }
}

function authorized(request: Request, expected: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!provided) {
    return false;
  }

  const left = Buffer.from(provided);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
