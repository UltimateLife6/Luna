const fictionalSlugs = new Set([
  "example-narrow-collar",
  "example-wrist-cuffs",
  "example-half-mask",
  "example-brow-headpiece",
  "example-chest-harness",
  "example-hip-harness",
  "example-shoulder-piece",
  "example-forearm-bracer",
]);

export function isMigratableCatalogSlug(slug: string): boolean {
  const value = slug.trim().toLowerCase();

  if (!value || fictionalSlugs.has(value)) {
    return false;
  }

  return !["example-", "test-", "builder-", "local-verification", "draft-piece", "archived-piece"].some((prefix) => value.startsWith(prefix));
}
