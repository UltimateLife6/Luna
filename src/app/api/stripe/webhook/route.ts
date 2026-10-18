import { connection } from "next/server";
import { readWebhookSecret } from "@/lib/commerce/config";
import { CommerceError } from "@/lib/commerce/errors";
import { commandFromStripeEvent } from "@/lib/commerce/events";
import { verifyWebhook } from "@/lib/commerce/stripe";
import { applyWebhookCommand, releaseExpiredReservations } from "@/lib/data/records";
import { assertStripeTestConfiguration } from "@/lib/platform/env";
import { logError } from "@/lib/platform/log";

export async function POST(request: Request) {
  await connection();

  try {
    assertStripeTestConfiguration(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    logError("stripe", error);
    return Response.json({ error: "Live payments stay off." }, { status: 503 });
  }

  const secret = readWebhookSecret();

  if (!secret) {
    return Response.json({ error: "Webhook signing secret is not set." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event;

  try {
    event = verifyWebhook(payload, signature, secret);
  } catch {
    return Response.json({ error: "Webhook signature was rejected." }, { status: 400 });
  }

  try {
    const command = commandFromStripeEvent(event);
    const now = new Date();

    if (command?.kind === "paid") {
      await applyWebhookCommand(command, now);
      await releaseExpiredReservations(now);
    } else {
      await releaseExpiredReservations(now);

      if (command) {
        await applyWebhookCommand(command, now);
      }
    }
  } catch (error) {
    logError("stripe-webhook", error);
    const message = error instanceof CommerceError ? error.errors[0] : "Webhook processing failed.";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ received: true });
}
