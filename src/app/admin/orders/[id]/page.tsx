import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { FulfillmentForm } from "@/components/admin/FulfillmentForm";
import { ReservationReviewForm } from "@/components/admin/ReservationReviewForm";
import { ShipmentForm } from "@/components/admin/ShipmentForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrackingRotateForm } from "@/components/admin/TrackingRotateForm";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { getOrder, orderActivity, orderDeliveries, orderShipment } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

type OrderPageProps = { params: Promise<{ id: string }> };

export const metadata = pageMetadata("Order");

export default async function AdminOrderPage({ params }: OrderPageProps) {
  await requireCatalogAdmin();
  await connection();
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    notFound();
  }

  const shipment = await orderShipment(order.id);
  const activity = await orderActivity(order.id);
  const deliveries = await orderDeliveries(order.id);
  const address = [order.shipping.name, order.shipping.line1, order.shipping.line2, order.shipping.city, order.shipping.region, order.shipping.postalCode, order.shipping.country]
    .filter((part) => part.length > 0)
    .join(", ");

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Order</h1>
        <AdminSectionNav current="orders" />
        <p className="mt-6 flex flex-wrap gap-2">
          <StatusBadge>{order.paymentStatus}</StatusBadge>
          <StatusBadge>{order.fulfillmentStatus}</StatusBadge>
          <StatusBadge>{shipment.trackingNumber ? "shipped" : "not shipped"}</StatusBadge>
          {order.needsReview ? <StatusBadge>manual review</StatusBadge> : null}
        </p>
        <dl className="mt-10 max-w-2xl space-y-4 text-sm text-ivory">
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-2 break-words">{order.email || "Not confirmed yet"}</dd>
          </div>
          <div>
            <dt className="eyebrow">Ship to</dt>
            <dd className="mt-2 break-words">{address || "Not confirmed yet"}</dd>
          </div>
          <div>
            <dt className="eyebrow">Subtotal</dt>
            <dd className="mt-2">{formatMinorUnits(order.subtotalMinor, order.currency)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Shipping</dt>
            <dd className="mt-2">
              {order.shippingAmountMinor === null
                ? "Not confirmed yet"
                : `${order.shippingLabel} · ${formatMinorUnits(order.shippingAmountMinor, order.currency)}`}
            </dd>
          </div>
        </dl>
        <ul className="mt-10 divide-y divide-ivory/10 border-y border-ivory/10">
          {order.lines.map((line) => (
            <li key={line.id} className="py-5 text-sm text-ivory">
              <p className="font-editorial text-3xl">{line.productName}</p>
              <p className="mt-2 text-silver">
                {line.variantLabel} · {line.sku} · {line.quantity} × {formatMinorUnits(line.unitPriceMinor, order.currency)}
              </p>
              {line.selections.map((selection) => (
                <p key={selection.optionId} className="mt-1 text-silver">
                  {selection.groupLabel}: {selection.optionLabel}
                  {selection.detail ? ` (${selection.detail})` : ""}
                </p>
              ))}
              {line.madeToOrder ? <p className="mt-2">Made to order. Finished pieces reserved: {line.reservedQuantity}.</p> : null}
              {line.leadTimeNote ? <p className="mt-2">Production note stored with this product: {line.leadTimeNote}</p> : null}
            </li>
          ))}
        </ul>
        {order.needsReview ? <ReservationReviewForm orderId={order.id} /> : null}
        <FulfillmentForm orderId={order.id} status={order.fulfillmentStatus} />
        <ShipmentForm orderId={order.id} carrier={shipment.carrier} trackingNumber={shipment.trackingNumber} />
        <TrackingRotateForm orderId={order.id} />
        <section className="mt-12">
          <h2 className="font-editorial text-3xl text-ivory">Activity</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-silver">No activity has been recorded for this order.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ivory/10 border-y border-ivory/10">
              {activity.map((event) => (
                <li key={event.id} className="py-4 text-sm text-ivory">
                  <p className="eyebrow">{event.kind}</p>
                  <p className="mt-2">{event.detail}</p>
                  <p className="mt-1 text-silver">{event.createdAt}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="mt-12">
          <h2 className="font-editorial text-3xl text-ivory">Notifications</h2>
          {deliveries.length === 0 ? (
            <p className="mt-4 text-sm text-silver">No notification has been recorded for this order.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ivory/10 border-y border-ivory/10">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="py-4 text-sm text-ivory">
                  <p className="flex flex-wrap gap-2">
                    <StatusBadge>{delivery.kind}</StatusBadge>
                    <StatusBadge>{delivery.status}</StatusBadge>
                  </p>
                  <p className="mt-2 break-words">{delivery.recipient}</p>
                  <p className="mt-1 text-silver">
                    Attempts: {delivery.attempts}
                    {delivery.lastError ? ` · ${delivery.lastError}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </article>
  );
}
