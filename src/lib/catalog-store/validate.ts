import type { CustomizationGroup, ImageInput, ProductInput, ProductStatus, VariantInput } from "@/lib/catalog-store/types";
import { customizationKinds, measurementUnits, productStatuses, purchaseModes } from "@/lib/catalog-store/types";

export const maxVariants = 6;
export const maxImages = 8;
export const maxCustomizationGroups = 4;
export const maxCustomizationOptions = 6;
export const maxPriceMinor = 100_000_000;
export const maxInventory = 1_000_000;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/;

export function slugFromName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isProductStatus(value: string): value is ProductStatus {
  return productStatuses.some((status) => status === value);
}

type ValidationContext = {
  categoryIds: readonly string[];
  assetIds: readonly string[];
};

export function validateProductInput(input: ProductInput, context: ValidationContext): string[] {
  const errors: string[] = [];

  if (input.name.trim().length < 1 || input.name.trim().length > 120) {
    errors.push("Enter a name of 120 characters or fewer.");
  }

  if (!slugPattern.test(input.slug)) {
    errors.push("Use a slug of lowercase letters, numbers, and hyphens.");
  }

  if (input.summary.trim().length < 1 || input.summary.trim().length > 280) {
    errors.push("Enter a summary of 280 characters or fewer.");
  }

  if (input.description.trim().length < 1 || input.description.trim().length > 4000) {
    errors.push("Enter a description of 4000 characters or fewer.");
  }

  if (!context.categoryIds.includes(input.categoryId)) {
    errors.push("Choose a category from the local catalog.");
  }

  if (!isProductStatus(input.status)) {
    errors.push("Choose draft, published, or archived.");
  }

  if (input.madeToOrderNote.trim().length > 240) {
    errors.push("Keep the made-to-order note to 240 characters or fewer.");
  }

  if (input.purchaseMode && !purchaseModes.some((mode) => mode === input.purchaseMode)) {
    errors.push("Choose quote-only or checkout.");
  }

  errors.push(...validateCustomization(input.customizationGroups));

  if (input.variants.length > maxVariants) {
    errors.push(`A product can have at most ${maxVariants} variants.`);
  }

  if (input.status === "published" && input.variants.length === 0) {
    errors.push("A published product needs at least one variant with a price and an inventory count.");
  }

  const skus = new Set<string>();

  input.variants.forEach((variant, index) => {
    errors.push(...validateVariant(variant, index, skus));
  });

  if (input.images.length > maxImages) {
    errors.push(`Attach at most ${maxImages} photographs.`);
  }

  const seenImages = new Set<string>();

  input.images.forEach((image) => {
    errors.push(...validateImage(image, context.assetIds, seenImages));
  });

  return errors;
}

function validateVariant(variant: VariantInput, index: number, skus: Set<string>): string[] {
  const errors: string[] = [];
  const label = `Variant ${index + 1}`;

  if (variant.label.trim().length < 1 || variant.label.trim().length > 80) {
    errors.push(`${label} needs a label of 80 characters or fewer.`);
  }

  if (variant.currency !== "USD") {
    errors.push(`${label} must use USD until another currency is confirmed.`);
  }

  if (!Number.isInteger(variant.priceMinor) || variant.priceMinor < 0 || variant.priceMinor > maxPriceMinor) {
    errors.push(`${label} needs a price in integer minor units from 0 through ${maxPriceMinor}.`);
  }

  if (!Number.isInteger(variant.inventoryCount) || variant.inventoryCount < 0 || variant.inventoryCount > maxInventory) {
    errors.push(`${label} needs a whole inventory count from 0 through ${maxInventory}.`);
  }

  const sku = variant.sku.trim();

  if (sku.length > 0) {
    if (!skuPattern.test(sku)) {
      errors.push(`${label} has a SKU that uses unsupported characters.`);
    } else if (skus.has(sku.toLowerCase())) {
      errors.push(`${label} repeats a SKU already used on this product.`);
    } else {
      skus.add(sku.toLowerCase());
    }
  }

  return errors;
}

function validateImage(image: ImageInput, assetIds: readonly string[], seen: Set<string>): string[] {
  if (!assetIds.includes(image.assetId)) {
    return ["One selected photograph is not in the local ledger."];
  }

  if (seen.has(image.assetId)) {
    return ["The same photograph is selected more than once."];
  }

  seen.add(image.assetId);
  return [];
}

function validateCustomization(groups: CustomizationGroup[] | undefined): string[] {
  if (!groups || groups.length === 0) {
    return [];
  }

  const errors: string[] = [];

  if (groups.length > maxCustomizationGroups) {
    errors.push(`Save at most ${maxCustomizationGroups} customization groups.`);
  }

  const groupIds = new Set<string>();

  groups.forEach((group, groupIndex) => {
    const groupLabel = `Customization group ${groupIndex + 1}`;

    if (group.label.trim().length < 1 || group.label.trim().length > 80) {
      errors.push(`${groupLabel} needs a label of 80 characters or fewer.`);
    }

    if (!/^[A-Za-z0-9-]{1,40}$/.test(group.id) || groupIds.has(group.id)) {
      errors.push(`${groupLabel} has an invalid id.`);
    }

    groupIds.add(group.id);

    const kind = group.kind ?? "single";

    if (!customizationKinds.some((value) => value === kind)) {
      errors.push(`${groupLabel} needs a single-choice, multi-choice, text, or measurement type.`);
    }

    if (kind === "text") {
      if (!Number.isInteger(group.textMaxLength) || (group.textMaxLength ?? 0) < 1 || (group.textMaxLength ?? 0) > 80) {
        errors.push(`${groupLabel} needs a text limit from 1 to 80 characters.`);
      }
    }

    if (kind === "measurement") {
      if (!group.unit || !measurementUnits.some((unit) => unit === group.unit)) {
        errors.push(`${groupLabel} needs a unit of in, cm, or mm.`);
      }

      if (group.min !== undefined && (!Number.isFinite(group.min) || group.min < 0)) {
        errors.push(`${groupLabel} has a minimum that is not a saved number.`);
      }

      if (group.max !== undefined && (!Number.isFinite(group.max) || group.max < 0)) {
        errors.push(`${groupLabel} has a maximum that is not a saved number.`);
      }

      if (group.min !== undefined && group.max !== undefined && group.max < group.min) {
        errors.push(`${groupLabel} has a maximum below its minimum.`);
      }
    }

    const choiceGroup = kind === "single" || kind === "multi";

    if (choiceGroup && (group.options.length < 1 || group.options.length > maxCustomizationOptions)) {
      errors.push(`${groupLabel} needs between 1 and ${maxCustomizationOptions} options.`);
    }

    if (!choiceGroup && group.options.length > 0) {
      errors.push(`${groupLabel} does not use a list of choices.`);
    }

    const optionIds = new Set<string>();

    group.options.forEach((option, optionIndex) => {
      const optionLabel = `${groupLabel} option ${optionIndex + 1}`;

      if (option.label.trim().length < 1 || option.label.trim().length > 80) {
        errors.push(`${optionLabel} needs a label of 80 characters or fewer.`);
      }

      if (!/^[A-Za-z0-9-]{1,40}$/.test(option.id) || optionIds.has(option.id)) {
        errors.push(`${optionLabel} has an invalid id.`);
      }

      optionIds.add(option.id);

      if (!Number.isInteger(option.priceAdjustmentMinor) || option.priceAdjustmentMinor < 0 || option.priceAdjustmentMinor > maxPriceMinor) {
        errors.push(`${optionLabel} needs an adjustment in integer minor units from 0 through ${maxPriceMinor}.`);
      }
    });
  });

  return errors;
}

export function validateCategoryInput(input: { name: string; slug: string; description: string }): string[] {
  const errors: string[] = [];

  if (input.name.trim().length < 1 || input.name.trim().length > 80) {
    errors.push("Enter a category name of 80 characters or fewer.");
  }

  if (!slugPattern.test(input.slug)) {
    errors.push("Use a category slug of lowercase letters, numbers, and hyphens.");
  }

  if (input.description.trim().length > 240) {
    errors.push("Keep the category description to 240 characters or fewer.");
  }

  return errors;
}
