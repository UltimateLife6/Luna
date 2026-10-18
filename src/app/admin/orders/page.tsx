import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { ShippingRateForm } from "@/components/admin/ShippingRateForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";
import { fulfillmentStatuses, paymentStatuses } from "@/lib/commerce/policy";
import { listOrders, listShippingRates, releaseExpiredReservations } from "@/lib/data/records";
import { filterOrders, isFulfillmentFilter, isPaymentFilter } from "@/lib/ops/filters";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Orders");

type OrdersPageProps = {
  searchParams: Promise<{ q?: string | string[]; payment?: string | string[]; fulfillment?: string | string[] }>;
};

export default function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-sm text-silver">Loading orders.</p>}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: OrdersPageProps) {
  await requireCatalogAdmin();
  await connection();
  await releaseExpiredReservations(new Date());
  const params = await searchParams;
  const query = first(params.q);
  const payment = first(params.payment);
  const fulfillment = first(params.fulfillment);
  const orders = filterOrders(await listOrders(), {
    query,
    payment: isPaymentFilter(payment) ? payment : "",
    fulfillment: isFulfillmentFilter(fulfillment) ? fulfillment : "",
  });
  const rates = await listShippingRates();

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Local only</p>
        <h1 className="mt-4 max-w-3xl font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Orders</h1>
        <AdminSectionNav current="orders" />
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-silver">
          Payment status changes only after a verified Stripe webhook. Fulfillment can be updated here. Refunds and shipping labels are not purchased from this screen.
        </p>
        <form method="get" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm text-ivory">
            Search
            <input className={mobileCheckoutFieldClass} name="q" defaultValue={query} placeholder="Email or name" />
          </label>
          <label className="block text-sm text-ivory">
            Payment
            <select className={mobileCheckoutFieldClass} name="payment" defaultValue={isPaymentFilter(payment) ? payment : ""}>
              <option value="">Any payment status</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ivory">
            Fulfillment
            <select className={mobileCheckoutFieldClass} name="fulfillment" defaultValue={isFulfillmentFilter(fulfillment) ? fulfillment : ""}>
              <option value="">Any fulfillment status</option>
              {fulfillmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center border border-ivory/60 px-4 text-xs uppercase tracking-[0.16em] text-ivory sm:w-auto">
              Filter
            </button>
          </div>
        </form>
        {orders.length === 0 ? (
          <p className="mt-12 text-base text-silver">No orders match this filter.</p>
        ) : (
          <ul className="mt-12 divide-y divide-ivory/10 border-y border-ivory/10">
            {orders.map((order) => (
              <li key={order.id} className="py-6">
                <p className="flex flex-wrap gap-2">
                  <StatusBadge>{order.paymentStatus}</StatusBadge>
                  <StatusBadge>{order.fulfillmentStatus}</StatusBadge>
                </p>
                <h2 className="mt-3 break-words font-editorial text-3xl text-ivory">{order.email || "Email not confirmed"}</h2>
                <p className="mt-2 text-sm text-silver">
                  {formatMinorUnits(order.totalMinor, order.currency)} · {order.lines.length} {order.lines.length === 1 ? "line" : "lines"}
                </p>
                <Link href={`/admin/orders/${order.id}`} className="mt-4 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                  View order
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ShippingRateForm rates={rates} />
      </Container>
    </article>
  );
}

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
