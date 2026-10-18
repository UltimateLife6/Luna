import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { readCustomerId } from "@/lib/customer/cookie";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { customerOrders } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Your orders");

export default async function CustomerOrdersPage() {
  await connection();
  const customerId = await readCustomerId();

  if (!customerId) {
    redirect("/account");
  }

  const orders = await customerOrders(customerId);

  return (
    <article>
      <PageIntro eyebrow="Account" title="Your orders." description="Only orders linked to this verified email address are listed." />
      <Container className="pb-20">
        {orders.length === 0 ? (
          <p className="text-base text-silver">No orders are linked to this account.</p>
        ) : (
          <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
            {orders.map((order) => (
              <li key={order.id} className="py-6">
                <p className="text-xs uppercase tracking-[0.16em] text-silver">
                  Payment {order.paymentStatus} · Fulfillment {order.fulfillmentStatus} · {order.shipment === "shipped" ? "Shipped" : "Not shipped"}
                </p>
                <p className="mt-3 font-editorial text-3xl text-ivory">{formatMinorUnits(order.totalMinor, order.currency)}</p>
                <Link href={`/account/orders/${order.id}`} className="mt-4 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                  View order
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </article>
  );
}
