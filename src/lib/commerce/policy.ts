import type { ProductStatus, PurchaseMode } from "@/lib/catalog-store/types";
import { madeToOrderQuantityCap } from "@/lib/commerce/config";

export const paymentStatuses = ["pending", "paid", "canceled", "refunded"] as const;
export const fulfillmentStatuses = ["unfulfilled", "processing", "fulfilled", "canceled"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export type LineOffer = {
  variantId: string;
  label: string;
  status: ProductStatus;
  purchaseMode: PurchaseMode;
  madeToOrder: boolean;
  inventoryCount: number;
  reservedCount: number;
  quantity: number;
};

export function lineProblems(lines: readonly LineOffer[]): string[] {
  const errors: string[] = [];
  const byVariant = new Map<string, LineOffer[]>();

  for (const line of lines) {
    if (line.status !== "published") {
      errors.push(`${line.label} is not available for purchase.`);
      continue;
    }

    if (line.purchaseMode !== "checkout") {
      errors.push(`${line.label} is quote-only and stays outside checkout.`);
      continue;
    }

    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      errors.push(`${line.label} needs a quantity of at least 1.`);
      continue;
    }

    const group = byVariant.get(line.variantId) ?? [];
    group.push(line);
    byVariant.set(line.variantId, group);
  }

  for (const group of byVariant.values()) {
    const first = group[0];
    const available = first.inventoryCount - first.reservedCount;
    const quantity = group.reduce((total, line) => total + line.quantity, 0);

    if (!Number.isInteger(first.inventoryCount) || !Number.isInteger(first.reservedCount) || available < 0) {
      errors.push(`${first.label} has a reservation that exceeds recorded inventory.`);
      continue;
    }

    if (first.madeToOrder) {
      if (quantity > madeToOrderQuantityCap) {
        errors.push(`${first.label} can be ordered in quantities up to ${madeToOrderQuantityCap} at a time.`);
      }
      continue;
    }

    if (quantity > available) {
      errors.push(
        available < 1
          ? `${first.label} has no finished pieces available.`
          : `${first.label} has ${available} finished ${available === 1 ? "piece" : "pieces"} available.`,
      );
    }
  }

  return errors;
}

export function reservedQuantity(line: LineOffer): number {
  const available = Math.max(0, line.inventoryCount - line.reservedCount);

  if (line.madeToOrder) {
    return Math.min(line.quantity, available);
  }

  return line.quantity;
}

export function transitionPayment(current: PaymentStatus, next: PaymentStatus): PaymentStatus {
  if (current === next) {
    return current;
  }

  const allowed: Record<PaymentStatus, readonly PaymentStatus[]> = {
    pending: ["paid", "canceled"],
    paid: ["refunded"],
    canceled: [],
    refunded: [],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Payment cannot move from ${current} to ${next}.`);
  }

  return next;
}

export function transitionFulfillment(payment: PaymentStatus, next: FulfillmentStatus): FulfillmentStatus {
  if (payment !== "paid" && payment !== "refunded") {
    throw new Error("Fulfillment can be updated after payment is confirmed.");
  }

  if (!fulfillmentStatuses.includes(next)) {
    throw new Error("Choose a fulfillment status.");
  }

  return next;
}
