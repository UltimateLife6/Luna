import { Suspense } from "react";
import { connection } from "next/server";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { verifyCustomerEmail } from "@/lib/customer/accounts";
import { pageMetadata } from "@/lib/metadata";
import { applicationSql } from "@/lib/platform/runtime";

export const metadata = pageMetadata("Verify email");

type VerifyPageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  return (
    <article>
      <PageIntro eyebrow="Account" title="Email verification." description="The address is linked to earlier guest orders only after this check succeeds." />
      <Container className="pb-20">
        <Suspense fallback={<p className="text-sm text-silver">Checking the verification link.</p>}>
          <VerifyResult searchParams={searchParams} />
        </Suspense>
      </Container>
    </article>
  );
}

async function VerifyResult({ searchParams }: VerifyPageProps) {
  await connection();
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const customer = token ? await verifyCustomerEmail(await applicationSql(), token, new Date()) : null;

  return (
    <p className="text-base text-silver">
      {customer ? "The email address is verified. Sign in to view linked orders." : "This verification link is not active."}
    </p>
  );
}
