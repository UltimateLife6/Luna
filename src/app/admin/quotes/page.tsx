import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { mobileCheckoutFieldClass } from "@/lib/commerce/mobile";
import { quoteStatuses } from "@/lib/commerce/quotes";
import { listQuoteRequests } from "@/lib/data/records";
import { filterQuotes } from "@/lib/ops/filters";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Quote requests");

type QuotesPageProps = { searchParams: Promise<{ q?: string | string[]; status?: string | string[] }> };

export default function AdminQuotesPage({ searchParams }: QuotesPageProps) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-sm text-silver">Loading quote requests.</p>}>
      <Quotes searchParams={searchParams} />
    </Suspense>
  );
}

async function Quotes({ searchParams }: QuotesPageProps) {
  await requireCatalogAdmin();
  await connection();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const quotes = filterQuotes(await listQuoteRequests(), {
    query,
    status: quoteStatuses.some((value) => value === status) ? status : "",
  });

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Local only</p>
        <h1 className="mt-4 max-w-3xl font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Quote requests</h1>
        <AdminSectionNav current="quotes" />
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-silver">
          These requests are not orders and are not charged. A price or production date stays unset until you confirm it outside this form.
        </p>
        <form method="get" className="mt-8 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-ivory">
            Search
            <input className={mobileCheckoutFieldClass} name="q" defaultValue={query} placeholder="Name, email, or product" />
          </label>
          <label className="block text-sm text-ivory">
            Status
            <select className={mobileCheckoutFieldClass} name="status" defaultValue={status}>
              <option value="">Any status</option>
              {quoteStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
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
        {quotes.length === 0 ? (
          <p className="mt-12 text-base text-silver">No quote requests match this filter.</p>
        ) : (
          <ul className="mt-12 divide-y divide-ivory/10 border-y border-ivory/10">
            {quotes.map((quote) => (
              <li key={quote.id} className="py-6">
                <StatusBadge>{quote.status}</StatusBadge>
                <h2 className="mt-3 font-editorial text-3xl text-ivory">{quote.productName}</h2>
                <p className="mt-2 break-words text-sm text-silver">
                  {quote.contactName} · {quote.email}
                </p>
                <Link href={`/admin/quotes/${quote.id}`} className="mt-4 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                  Review request
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </article>
  );
}
