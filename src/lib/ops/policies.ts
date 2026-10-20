import { one, type Sql } from "@/lib/platform/sql";

export const policySlugs = ["shipping", "returns", "privacy", "terms", "custom-orders"] as const;

export type PolicySlug = (typeof policySlugs)[number];

export type StorePolicy = {
  slug: PolicySlug;
  title: string;
  body: string;
  published: boolean;
  updatedAt: string;
};

export function isPolicySlug(value: string): value is PolicySlug {
  return policySlugs.some((slug) => slug === value);
}

const policyTitles: Record<PolicySlug, string> = {
  shipping: "Shipping",
  returns: "Returns and exchanges",
  privacy: "Privacy",
  terms: "Terms",
  "custom-orders": "Custom-order policies",
};

export function unpublishedPolicyShells(): StorePolicy[] {
  return policySlugs.map((slug) => ({
    slug,
    title: policyTitles[slug],
    body: "",
    published: false,
    updatedAt: "1970-01-01T00:00:00.000Z",
  }));
}

export function policyPublicationDecision(body: string, publish: boolean): { published: boolean } | { error: string } {
  if (body.length > 20000) {
    return { error: "The policy text is too long to save." };
  }

  if (publish && body.trim().length === 0) {
    return { error: "A policy with no text stays unpublished." };
  }

  return { published: publish && body.trim().length > 0 };
}

export async function listPolicies(sql: Sql): Promise<StorePolicy[]> {
  const rows = await sql.query<Record<string, unknown>>("SELECT slug, title, body, published, updated_at FROM store_policies ORDER BY slug");
  return rows.flatMap((row) => {
    const policy = readPolicy(row);
    return policy ? [policy] : [];
  });
}

export async function getPolicy(sql: Sql, slug: string): Promise<StorePolicy | null> {
  if (!isPolicySlug(slug)) {
    return null;
  }

  const row = await one<Record<string, unknown>>(sql, "SELECT slug, title, body, published, updated_at FROM store_policies WHERE slug = ?", [slug]);
  return row ? readPolicy(row) : null;
}

export async function savePolicy(sql: Sql, slug: string, body: string, publish: boolean, now: Date): Promise<StorePolicy> {
  const decision = policyPublicationDecision(body, publish);

  if ("error" in decision) {
    throw new Error(decision.error);
  }

  const existing = await getPolicy(sql, slug);

  if (!existing) {
    throw new Error("That policy section does not exist.");
  }

  await sql.execute("UPDATE store_policies SET body = ?, published = ?, updated_at = ? WHERE slug = ?", [
    body,
    decision.published ? 1 : 0,
    now.toISOString(),
    slug,
  ]);
  const saved = await getPolicy(sql, slug);

  if (!saved) {
    throw new Error("That policy section does not exist.");
  }

  return saved;
}

function readPolicy(row: Record<string, unknown>): StorePolicy | null {
  const slug = String(row.slug);

  if (!isPolicySlug(slug)) {
    return null;
  }

  return {
    slug,
    title: String(row.title),
    body: String(row.body),
    published: Number(row.published) === 1 && String(row.body).trim().length > 0,
    updatedAt: String(row.updated_at),
  };
}
