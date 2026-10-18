import Link from "next/link";
import { connection } from "next/server";
import { signOutCustomerAction } from "@/app/account/actions";
import { AccountForms } from "@/components/account/AccountForms";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { readCustomerId } from "@/lib/customer/cookie";
import { getCustomer } from "@/lib/customer/accounts";
import { pageMetadata } from "@/lib/metadata";
import { authConfiguration } from "@/lib/platform/env";
import { applicationSql } from "@/lib/platform/runtime";

export const metadata = pageMetadata("Account");

export default async function AccountPage() {
  await connection();
  const configuration = authConfiguration();
  const customerId = await readCustomerId();
  const customer = customerId ? await getCustomer(await applicationSql(), customerId) : null;

  return (
    <article>
      <PageIntro
        eyebrow="Account"
        title="Optional customer account."
        description="Guest checkout stays available. An account can show orders after the email address is verified."
      />
      <Container className="pb-20">
        {"error" in configuration ? (
          <p className="text-base text-silver">Customer accounts are closed until AUTH_SECRET is set.</p>
        ) : customer ? (
          <div className="space-y-6">
            <p className="break-words text-sm text-ivory">{customer.email}</p>
            <Link href="/account/orders" className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em] text-ivory">
              View orders
            </Link>
            <form action={signOutCustomerAction}>
              <button type="submit" className="inline-flex min-h-12 items-center text-xs uppercase tracking-[0.16em] text-silver">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <AccountForms />
        )}
      </Container>
    </article>
  );
}
