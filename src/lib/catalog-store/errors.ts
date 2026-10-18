export class CatalogStoreError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors[0] ?? "The catalog record was rejected.");
    this.name = "CatalogStoreError";
    this.errors = errors;
  }
}
