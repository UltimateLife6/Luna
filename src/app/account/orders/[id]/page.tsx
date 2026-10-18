import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { readCustomerId } from "@/lib/customer/cookie";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { customerOrder } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Your order");

type CustomerOrderPageProps = { params: Promise<{ id: string }> };

export default async function CustomerOrderPage({ params }: CustomerOrderPageProps) {
  await connection();
  const customerId = await readCustomerId();

  if (!customerId) {
    redirect("/account");
  }

  const { id } = await params;
  const order = await customerOrder(customerId, id);

  return (
    <article>
      <PageIntro eyebrow="Account" title="Order." description="Payment and fulfillment are shown separately." />
      <Container className="pb-20">
        {!order ? (
          <p className="text-base text-silver">That order is not on this account.</p>
        ) : (
          <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-ivory">
            <p>Payment status: {order.paymentStatus}.</p>
            <p>Fulfillment status: {order.fulfillmentStatus}.</p>
            <p>{order.shipment === "shipped" ? `Shipped. Tracking number: ${order.trackingNumber}.` : "No tracking number is saved."}</p>
            {order.carrier ? <p>Carrier entered: {order.carrier}.</p> : null}
            <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
              {order.lines.map((line) => (
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
            <p>Total: {formatMinorUnits(order.totalMinor, order.currency)}.</p>
          </div>
        )}
      </Container>
    </article>
  );
}
