import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { adminAccess, type AdminAccess } from "@/lib/catalog-store/auth";
import { appEnv, authConfiguration } from "@/lib/platform/env";
import { authKit } from "@/auth";

export async function localAdminGate(): Promise<"ready" | "missing-auth"> {
  await connection();
  const configuration = authConfiguration();

  if ("error" in configuration) {
    if (appEnv() !== "local") {
      notFound();
    }

    return "missing-auth";
  }

  return "ready";
}

export async function currentAdminAccess(): Promise<AdminAccess | "missing-auth"> {
  await connection();
  const configuration = authConfiguration();

  if ("error" in configuration) {
    return appEnv() === "local" ? "missing-auth" : "closed";
  }

  const kit = authKit();
  const session = kit ? await kit.auth() : null;
  const role = session?.user && "role" in session.user && typeof session.user.role === "string" ? session.user.role : null;
  return adminAccess({ configured: true, role });
}

export async function requireCatalogAdmin(): Promise<void> {
  const access = await currentAdminAccess();

  if (access === "missing-auth") {
    notFound();
  }

  if (access !== "ready") {
    redirect("/admin/login");
  }
}

export async function adminDenialMessage(): Promise<string | null> {
  const access = await currentAdminAccess();

  if (access === "ready") {
    return null;
  }

  return access === "anonymous" ? "Sign in to the catalog admin." : "Catalog admin is closed.";
}

export async function quoteAdminAccess(): Promise<AdminAccess> {
  const access = await currentAdminAccess();
  return access === "missing-auth" ? "closed" : access;
}
