export class CommerceError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super(errors[0] ?? "Checkout was rejected.");
    this.name = "CommerceError";
    this.errors = errors;
  }
}
