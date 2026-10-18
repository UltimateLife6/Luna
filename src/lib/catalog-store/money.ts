/** USD is the only currency formatted here. Amounts are integer cents. */
export function formatMinorUnits(amount: number, currency = "USD"): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Price must be a non-negative integer in minor units.");
  }

  if (currency !== "USD") {
    throw new Error("Only USD formatting is confirmed.");
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100);
}

export function formatPriceRange(variants: readonly { priceMinor: number; currency: string }[]): string {
  if (variants.length === 0) {
    return "Price not set";
  }

  const currency = variants[0]?.currency ?? "USD";

  if (variants.some((variant) => variant.currency !== currency)) {
    return "Price unavailable";
  }

  const amounts = variants.map((variant) => variant.priceMinor);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);

  if (min === max) {
    return formatMinorUnits(min, currency);
  }

  return `${formatMinorUnits(min, currency)}–${formatMinorUnits(max, currency)}`;
}
