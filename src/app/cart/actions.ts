"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { readCartId, writeCartId } from "@/lib/commerce/cart-cookie";
import { writeTrackingHint } from "@/lib/ops/tracking-cookie";
import { checkoutBlockers, readStripeSecret, readWebhookSecret } from "@/lib/commerce/config";
import { CommerceError } from "@/lib/commerce/errors";
import { buildCheckoutSessionParams } from "@/lib/commerce/session";
import { createCheckoutSession, expireOpenCheckoutSession, readCheckoutSession } from "@/lib/commerce/stripe";
import type { ConfigurationInput } from "@/lib/commerce/selection";
import {
  abortPendingOrder,
  activeShippingRates,
  addCartItem,
  attachStripeSession,
  createCart,
  findPendingCheckout,
  issueCheckoutTrackingToken,
  placePendingOrder,
  removeCartItem,
  setCartItemQuantity,
} from "@/lib/data/records";
import { assertStripeTestConfiguration } from "@/lib/platform/env";
import { logError } from "@/lib/platform/log";

export type FormState = { errors: string[] };

export async function addToCartAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  const variantId = text(formData, "variantId");
  const quantity = wholeNumber(text(formData, "quantity"));

  try {
    let cartId = await readCartId();

    if (!cartId) {
      cartId = await createCart(new Date());
      await writeCartId(cartId);
    }

    if (quantity === null) {
      return { errors: ["Enter a whole quantity."] };
    }

    await addCartItem(cartId, variantId, quantity, configurationFromForm(formData), new Date(), formData.get("price"));
  } catch (error) {
    return { errors: commerceErrors(error) };
  }

  redirect("/cart");
}

export async function updateCartItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  const itemId = text(formData, "itemId");
  const quantity = wholeNumber(text(formData, "quantity"));
  const cartId = await readCartId();

  if (!cartId) {
    return { errors: ["The cart is empty."] };
  }

  if (quantity === null) {
    return { errors: ["Enter a whole quantity."] };
  }

  try {
    await setCartItemQuantity(cartId, itemId, quantity, new Date());
  } catch (error) {
    return { errors: commerceErrors(error) };
  }

  return { errors: [] };
}

export async function removeCartItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  const cartId = await readCartId();

  if (!cartId) {
    return { errors: ["The cart is empty."] };
  }

  await removeCartItem(cartId, text(formData, "itemId"));
  return { errors: [] };
}

export async function checkoutAction(state: FormState, formData: FormData): Promise<FormState> {
  void state;
  void formData;
  await connection();
  const cartId = await readCartId();

  if (!cartId) {
    return { errors: ["The cart is empty."] };
  }

  const blockers = await currentBlockers();

  if (blockers.length > 0) {
    return { errors: blockers };
  }

  const secretKey = readStripeSecret();

  if (!secretKey) {
    return { errors: ["Stripe test secret key is not set."] };
  }

  let orderId: string | null = null;
  let createdSessionId: string | null = null;

  try {
    assertStripeTestConfiguration(secretKey);
    const pendingCheckout = await findPendingCheckout(cartId, new Date());

    if (pendingCheckout?.stripeSessionId) {
      const existing = await readCheckoutSession(secretKey, pendingCheckout.stripeSessionId);

      if (existing.status === "open" && existing.url) {
        redirect(existing.url);
      }

      if (existing.status === "complete") {
        redirect(`/checkout/return?session_id=${encodeURIComponent(pendingCheckout.stripeSessionId)}`);
      }

      if (existing.status === "expired") {
        return {
          errors: ["Stripe has expired that Checkout session. The finished piece stays reserved until Stripe shows that payment cannot still complete."],
        };
      }

      return { errors: ["The existing Checkout session could not be read. The hold was left in place."] };
    }

    const pending = await placePendingOrder(cartId, new Date());
    orderId = pending.orderId;
    const trackingToken = await issueCheckoutTrackingToken(pending.orderId, new Date());

    if (trackingToken) {
      await writeTrackingHint(trackingToken);
    }
    const session = await createCheckoutSession(
      secretKey,
      buildCheckoutSessionParams({
        orderId: pending.orderId,
        origin: await requestOrigin(),
        expiresAt: pending.expiresAt,
        lines: pending.lines,
        rates: pending.rates,
      }),
    );
    createdSessionId = session.id;
    await attachStripeSession(pending.orderId, session.id);
    redirect(session.url);
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    if (createdSessionId) {
      try {
        await expireOpenCheckoutSession(secretKey, createdSessionId);
      } catch (expireError) {
        logError("stripe-expire", expireError);
        return { errors: ["Checkout did not open. The finished piece stays reserved until the hold ends."] };
      }
    }

    if (orderId) {
      try {
        await abortPendingOrder(orderId, new Date());
      } catch {
        // The pending order stays reserved until its hold expires.
      }
    }

    return { errors: commerceErrors(error) };
  }
}

async function currentBlockers(): Promise<string[]> {
  return checkoutBlockers({
    secretKey: readStripeSecret(),
    webhookSecret: readWebhookSecret(),
    shippingRates: await activeShippingRates(),
  });
}

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new CommerceError(["Checkout could not determine the local site address."]);
  }

  return `${proto}://${host}`;
}

function configurationFromForm(formData: FormData): ConfigurationInput {
  const optionIds: string[] = [];
  const texts: ConfigurationInput["texts"] = [];
  const measurements: ConfigurationInput["measurements"] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    if (key === "price" || key === "adjustment" || key === "unitAmount" || key.endsWith("_price")) {
      continue;
    }

    if (key === "optionId" || key.startsWith("choice_")) {
      optionIds.push(value);
    } else if (key.startsWith("text_")) {
      texts.push({ groupId: key.slice("text_".length), value });
    } else if (key.startsWith("measure_")) {
      measurements.push({ groupId: key.slice("measure_".length), value });
    }
  }

  return { optionIds, texts, measurements };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function wholeNumber(value: string): number | null {
  return /^\d+$/.test(value) ? Number(value) : null;
}

function commerceErrors(error: unknown): string[] {
  return error instanceof CommerceError ? error.errors : ["Checkout could not be completed."];
}

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
