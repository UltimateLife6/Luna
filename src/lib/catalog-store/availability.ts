export type AvailabilityCode = "in-stock" | "out-of-stock" | "made-to-order" | "made-to-order-and-in-stock" | "unknown";

export type Availability = {
  code: AvailabilityCode;
  units: number;
  text: string;
};

export function availabilityFor(madeToOrder: boolean, inventoryCount: number): Availability {
  if (!Number.isInteger(inventoryCount) || inventoryCount < 0) {
    return {
      code: "unknown",
      units: 0,
      text: "Availability is unknown because the inventory count is not a whole number.",
    };
  }

  if (inventoryCount > 0 && madeToOrder) {
    const noun = inventoryCount === 1 ? "piece" : "pieces";
    return {
      code: "made-to-order-and-in-stock",
      units: inventoryCount,
      text: `${inventoryCount} finished ${noun} available. Further pieces are made to order.`,
    };
  }

  if (inventoryCount > 0) {
    const noun = inventoryCount === 1 ? "piece" : "pieces";
    return {
      code: "in-stock",
      units: inventoryCount,
      text: `${inventoryCount} finished ${noun} available.`,
    };
  }

  if (madeToOrder) {
    return {
      code: "made-to-order",
      units: 0,
      text: "Made to order. No finished pieces are available.",
    };
  }

  return {
    code: "out-of-stock",
    units: 0,
    text: "Out of stock.",
  };
}

export function availabilityForVariants(
  madeToOrder: boolean,
  variants: readonly { inventoryCount: number }[],
): Availability {
  if (variants.length === 0) {
    return {
      code: "unknown",
      units: 0,
      text: "No variants are recorded, so availability is unknown.",
    };
  }

  return availabilityFor(
    madeToOrder,
    variants.reduce((total, variant) => total + variant.inventoryCount, 0),
  );
}
