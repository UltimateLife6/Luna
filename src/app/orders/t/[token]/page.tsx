import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { lookupTrackedOrder } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";
import { currentTrackingSubject } from "@/lib/ops/client-subject";

export const metadata = pageMetadata("Order status");

type TrackingPageProps = { params: Promise<{ token: string }> };

export default async function TrackingPage({ params }: TrackingPageProps) {
  await connection();
  const { token } = await params;
  const result = await lookupTrackedOrder(decodeURIComponent(token), await currentTrackingSubject(), new Date());

  return (
    <article>
      <PageIntro eyebrow="Orders" title="Order status." description="Payment and fulfillment are shown separately. The street address is not shown." />
      <Container className="pb-20">
        {result.status !== "found" ? (
          <p className="text-base text-silver">{result.message}</p>
        ) : (
          <div className="max-w-2xl space-y-4 break-words text-sm leading-relaxed text-ivory">
            <p>Payment status: {result.order.paymentStatus}.</p>
            <p>Fulfillment status: {result.order.fulfillmentStatus}.</p>
            <p>
              {result.order.shipment === "shipped"
                ? `Shipped. Tracking number: ${result.order.trackingNumber}.`
                : "No tracking number is saved."}
            </p>
            {result.order.carrier ? <p>Carrier entered: {result.order.carrier}.</p> : null}
            <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
              {result.order.lines.map((line) => (
                <li key={`${line.productName}-${line.variantLabel}`} className="py-4">
                  <p className="font-editorial text-3xl">{line.productName}</p>
                  <p className="mt-2 text-silver">
                    {line.variantLabel} · {line.quantity}
                  </p>
                  {line.selections.map((selection) => (
                    <p key={selection} className="mt-1 text-silver">
                      {selection}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            <p>Subtotal: {formatMinorUnits(result.order.subtotalMinor, result.order.currency)}.</p>
            <p>
              {result.order.shippingAmountMinor === null
                ? "Shipping has not been confirmed."
                : `Shipping: ${result.order.shippingLabel} ${formatMinorUnits(result.order.shippingAmountMinor, result.order.currency)}.`}
            </p>
            <p>Total: {formatMinorUnits(result.order.totalMinor, result.order.currency)}.</p>
          </div>
        )}
      </Container>
    </article>
  );
}
