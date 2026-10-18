import { LoginForm } from "@/components/admin/LoginForm";
import { Container } from "@/components/ui/Container";
import { currentAdminAccess, localAdminGate } from "@/lib/catalog-store/access";
import { pageMetadata } from "@/lib/metadata";
import { redirect } from "next/navigation";

export const metadata = pageMetadata("Catalog admin");

export default async function AdminLoginPage() {
  const gate = await localAdminGate();

  if (gate === "ready" && (await currentAdminAccess()) === "ready") {
    redirect("/admin/products");
  }

  return (
    <article className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">Catalog admin</p>
        <h1 className="mt-4 max-w-3xl font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">Catalog admin</h1>
        {gate === "missing-auth" ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-silver">
            Set AUTH_SECRET in the environment, then run npm run admin:create with ADMIN_EMAIL and ADMIN_PASSWORD. This screen does not create an account, and it does not store a password in the repository.
          </p>
        ) : (
          <>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-silver">
              Sign in with an owner account. No account is created here. Live payments stay off.
            </p>
            <div className="mt-10">
              <LoginForm />
            </div>
          </>
        )}
      </Container>
    </article>
  );
}
