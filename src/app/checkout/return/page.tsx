import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { checkoutTrackingMatches, orderForSession } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";
import { readTrackingHint } from "@/lib/ops/tracking-cookie";

export const metadata = pageMetadata("Checkout return");
export const ensureStatic = "shell";

type CheckoutReturnPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

export default function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
  return (
    <article>
      <PageIntro
        eyebrow="Checkout"
        title="Return from Stripe."
        description="This page does not mark an order paid. The status below is the local order record."
      />
      <Container className="pb-20">
        <Suspense fallback={<p className="text-sm text-silver">Checking the local order.</p>}>
          <ReturnStatus searchParams={searchParams} />
        </Suspense>
      </Container>
    </article>
  );
}

async function ReturnStatus({ searchParams }: { searchParams: CheckoutReturnPageProps["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const order = sessionId ? await orderForSession(sessionId) : null;

  if (!order) {
    return <p className="text-base text-silver">No local order matches this Checkout return.</p>;
  }

  const trackingToken = await readTrackingHint();
  const trackingReady = trackingToken ? await checkoutTrackingMatches(trackingToken, order.id) : false;

  return (
    <div className="max-w-2xl space-y-4 break-words text-sm leading-relaxed text-ivory">
      <p>Payment status: {order.paymentStatus}.</p>
      <p>Fulfillment status: {order.fulfillmentStatus}.</p>
      {trackingReady && trackingToken ? (
        <p>
          <Link href={`/orders/t/${trackingToken}`} className="inline-flex min-h-11 items-center text-ivory underline">
            View order status
          </Link>
        </p>
      ) : (
        <p>The tracking link for this browser is not available on this return.</p>
      )}
      <p>Subtotal: {formatMinorUnits(order.subtotalMinor, order.currency)}.</p>
      <p>
        {order.shippingAmountMinor === null
          ? "Shipping has not been confirmed by Stripe."
          : `Shipping: ${order.shippingLabel} ${formatMinorUnits(order.shippingAmountMinor, order.currency)}.`}
      </p>
      {order.paymentStatus === "pending" ? <p>Payment stays pending until a verified Stripe webhook arrives.</p> : null}
    </div>
  );
}
