import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { storePolicy } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

type PolicyPageProps = { params: Promise<{ slug: string }> };

export const metadata = pageMetadata("Policy");

export default async function PolicyPage({ params }: PolicyPageProps) {
  await connection();
  const { slug } = await params;
  const policy = await storePolicy(slug);

  return (
    <article>
      <PageIntro eyebrow="Policies" title={policy?.title ?? "Policy"} description="Only text the owner has published is shown." />
      <Container className="pb-20">
        {policy?.published ? (
          <div className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-ivory">{policy.body}</div>
        ) : (
          <p className="text-base text-silver">This policy has not been published.</p>
        )}
      </Container>
    </article>
  );
}
