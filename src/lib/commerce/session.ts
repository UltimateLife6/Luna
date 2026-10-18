import type Stripe from "stripe";
import type { ShippingRate } from "@/lib/commerce/store";

export type CheckoutLine = {
  name: string;
  description: string;
  unitAmountMinor: number;
  quantity: number;
};

export function buildCheckoutSessionParams(input: {
  orderId: string;
  origin: string;
  expiresAt: Date;
  lines: CheckoutLine[];
  rates: ShippingRate[];
}): Stripe.Checkout.SessionCreateParams {
  const countries = input.rates[0]?.countries ?? [];

  return {
    mode: "payment",
    client_reference_id: input.orderId,
    metadata: { orderId: input.orderId },
    expires_at: Math.floor(input.expiresAt.getTime() / 1000),
    success_url: `${input.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/checkout/cancel`,
    adaptive_pricing: { enabled: false },
    automatic_tax: { enabled: false },
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"],
    },
    shipping_options: input.rates.map((rate) => ({
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: rate.label,
        fixed_amount: { amount: rate.amountMinor, currency: "usd" },
        metadata: { rateId: rate.id },
      },
    })),
    line_items: input.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: "usd",
        unit_amount: line.unitAmountMinor,
        product_data: {
          name: line.name,
          description: line.description || undefined,
        },
      },
    })),
  };
}
