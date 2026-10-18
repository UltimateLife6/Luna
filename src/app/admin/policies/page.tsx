import Link from "next/link";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { storePolicies } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Policies");

export default async function AdminPoliciesPage() {
  await requireCatalogAdmin();
  await connection();
  const policies = await storePolicies();

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Local only</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Policies</h1>
        <AdminSectionNav current="policies" />
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-silver">
          These sections stay unpublished until the owner pastes and approves the actual text.
        </p>
        <ul className="mt-12 divide-y divide-ivory/10 border-y border-ivory/10">
          {policies.map((policy) => (
            <li key={policy.slug} className="py-6">
              <StatusBadge>{policy.published ? "published" : "unpublished"}</StatusBadge>
              <h2 className="mt-3 font-editorial text-3xl text-ivory">{policy.title}</h2>
              <Link href={`/admin/policies/${policy.slug}`} className="mt-4 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                Edit section
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </article>
  );
}
