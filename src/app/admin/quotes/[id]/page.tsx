import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { QuoteReviewForm } from "@/components/admin/QuoteReviewForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { getQuoteRequest, orderDeliveries } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

type QuotePageProps = { params: Promise<{ id: string }> };

export const metadata = pageMetadata("Quote request");

export default async function AdminQuotePage({ params }: QuotePageProps) {
  await requireCatalogAdmin();
  await connection();
  const { id } = await params;
  const quote = await getQuoteRequest(id);

  if (!quote) {
    notFound();
  }

  const deliveries = await orderDeliveries(quote.id);

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Local only</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">{quote.productName}</h1>
        <AdminSectionNav current="quotes" />
        <dl className="mt-10 max-w-2xl space-y-4 text-sm text-ivory">
          <div>
            <dt className="eyebrow">Status</dt>
            <dd className="mt-2">{quote.status}</dd>
          </div>
          <div>
            <dt className="eyebrow">Name</dt>
            <dd className="mt-2">{quote.contactName}</dd>
          </div>
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-2">{quote.email}</dd>
          </div>
          <div>
            <dt className="eyebrow">Requested details</dt>
            <dd className="mt-2 whitespace-pre-wrap leading-relaxed">{quote.details}</dd>
          </div>
        </dl>
        <QuoteReviewForm id={quote.id} status={quote.status} adminNote={quote.adminNote} />
        <section className="mt-12">
          <h2 className="font-editorial text-3xl text-ivory">Notifications</h2>
          {deliveries.length === 0 ? (
            <p className="mt-4 text-sm text-silver">No notification has been recorded for this request.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ivory/10 border-y border-ivory/10">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="py-4 text-sm text-ivory">
                  <p className="flex flex-wrap gap-2">
                    <StatusBadge>{delivery.kind}</StatusBadge>
                    <StatusBadge>{delivery.status}</StatusBadge>
                  </p>
                  <p className="mt-2">Attempts: {delivery.attempts}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </article>
  );
}
