import Link from "next/link";
import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { storePolicies } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Policies");

export default async function PoliciesPage() {
  await connection();
  const policies = await storePolicies();

  return (
    <article>
      <PageIntro eyebrow="Policies" title="Store policies." description="Policies will be posted here." />
      <Container className="pb-20">
        <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
          {policies.map((policy) => (
            <li key={policy.slug} className="py-6">
              <h2 className="font-editorial text-3xl text-ivory">{policy.title}</h2>
              <p className="mt-2 text-sm text-silver">{policy.published ? "Published" : "Not published"}</p>
              <Link href={`/policies/${policy.slug}`} className="mt-4 inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
                Open section
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </article>
  );
}
