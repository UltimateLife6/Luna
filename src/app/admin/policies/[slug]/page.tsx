import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { PolicyForm } from "@/components/admin/PolicyForm";
import { Container } from "@/components/ui/Container";
import { requireCatalogAdmin } from "@/lib/catalog-store/access";
import { storePolicy } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

type PolicyPageProps = { params: Promise<{ slug: string }> };

export const metadata = pageMetadata("Edit policy");

export default async function AdminPolicyPage({ params }: PolicyPageProps) {
  await requireCatalogAdmin();
  await connection();
  const { slug } = await params;
  const policy = await storePolicy(slug);

  if (!policy) {
    notFound();
  }

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">{policy.title}</h1>
        <AdminSectionNav current="policies" />
        <PolicyForm slug={policy.slug} body={policy.body} published={policy.published} />
      </Container>
    </article>
  );
}
