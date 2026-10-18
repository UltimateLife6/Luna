import { CommerceError } from "@/lib/commerce/errors";

export function lineTotalMinor(unitPriceMinor: number, adjustmentMinor: number, quantity: number): number {
  assertMinor(unitPriceMinor, "A unit price");
  assertMinor(adjustmentMinor, "A customization adjustment");

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CommerceError(["Quantity must be a whole number of at least 1."]);
  }

  return (unitPriceMinor + adjustmentMinor) * quantity;
}

export function sumMinor(amounts: number[]): number {
  return amounts.reduce((total, amount) => {
    assertMinor(amount, "A line total");
    return total + amount;
  }, 0);
}

function assertMinor(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CommerceError([`${label} must be a non-negative integer in minor units.`]);
  }
}
