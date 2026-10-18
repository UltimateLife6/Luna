import { randomUUID } from "node:crypto";
import type { CustomizationGroup, CustomizationKind, ImageInput, ProductInput, VariantInput } from "@/lib/catalog-store/types";
import { maxCustomizationGroups, maxCustomizationOptions, maxVariants, slugFromName, validateProductInput } from "@/lib/catalog-store/validate";

export type ProductFormResult = { ok: true; value: ProductInput } | { ok: false; errors: string[] };

type FormContext = {
  categoryIds: readonly string[];
  assetIds: readonly string[];
};

export function productInputFromForm(formData: FormData, context: FormContext): ProductFormResult {
  const errors: string[] = [];
  const name = text(formData, "name");
  const requestedSlug = text(formData, "slug");
  const slug = requestedSlug || slugFromName(name);
  const variants = readVariants(formData, errors);
  const images = readImages(formData, context.assetIds);
  const status = text(formData, "status");
  const purchaseMode = text(formData, "purchaseMode");
  const customizationGroups = readCustomization(formData, errors);

  const input: ProductInput = {
    id: text(formData, "id") || undefined,
    name,
    slug,
    summary: text(formData, "summary"),
    description: text(formData, "description"),
    categoryId: text(formData, "categoryId"),
    status: status === "draft" || status === "published" || status === "archived" ? status : "draft",
    madeToOrder: formData.get("madeToOrder") === "on",
    madeToOrderNote: text(formData, "madeToOrderNote"),
    purchaseMode: purchaseMode === "checkout" ? "checkout" : "quote-only",
    customizationGroups,
    variants,
    images,
  };

  if (purchaseMode && purchaseMode !== "checkout" && purchaseMode !== "quote-only") {
    errors.push("Choose quote-only or checkout.");
  }

  if (status !== "draft" && status !== "published" && status !== "archived") {
    errors.push("Choose draft, published, or archived.");
  }

  errors.push(...validateProductInput(input, context));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: input };
}

function readVariants(formData: FormData, errors: string[]): VariantInput[] {
  const variants: VariantInput[] = [];

  for (let index = 0; index < maxVariants; index += 1) {
    const label = text(formData, `variant_${index}_label`);
    const sku = text(formData, `variant_${index}_sku`);
    const price = text(formData, `variant_${index}_price`);
    const inventory = text(formData, `variant_${index}_inventory`);
    const id = text(formData, `variant_${index}_id`);
    const blank = label === "" && sku === "" && price === "" && inventory === "";

    if (blank) {
      continue;
    }

    if (label === "" || price === "" || inventory === "") {
      errors.push(`Variant ${index + 1} needs a label, a price in minor units, and an inventory count.`);
      continue;
    }

    if (!/^\d+$/.test(price)) {
      errors.push(`Variant ${index + 1} price must be a whole number of minor units, without a decimal.`);
      continue;
    }

    if (!/^\d+$/.test(inventory)) {
      errors.push(`Variant ${index + 1} inventory must be a whole number.`);
      continue;
    }

    variants.push({
      id: id || undefined,
      label,
      sku,
      currency: "USD",
      priceMinor: Number(price),
      inventoryCount: Number(inventory),
    });
  }

  return variants;
}

function readCustomization(formData: FormData, errors: string[]): CustomizationGroup[] {
  const groups: CustomizationGroup[] = [];

  for (let groupIndex = 0; groupIndex < maxCustomizationGroups; groupIndex += 1) {
    const label = text(formData, `group_${groupIndex}_label`);
    const kind = readKind(text(formData, `group_${groupIndex}_kind`));
    const options: CustomizationGroup["options"] = [];

    for (let optionIndex = 0; optionIndex < maxCustomizationOptions; optionIndex += 1) {
      const optionLabel = text(formData, `group_${groupIndex}_option_${optionIndex}_label`);
      const price = text(formData, `group_${groupIndex}_option_${optionIndex}_price`);

      if (optionLabel === "" && price === "") {
        continue;
      }

      if (optionLabel === "") {
        errors.push(`Customization group ${groupIndex + 1} option ${optionIndex + 1} needs a label.`);
        continue;
      }

      if (price !== "" && !/^\d+$/.test(price)) {
        errors.push(`Customization group ${groupIndex + 1} option ${optionIndex + 1} adjustment must be a whole number of minor units.`);
        continue;
      }

      options.push({
        id: text(formData, `group_${groupIndex}_option_${optionIndex}_id`) || randomUUID(),
        label: optionLabel,
        priceAdjustmentMinor: price === "" ? 0 : Number(price),
        available: formData.get(`group_${groupIndex}_option_${optionIndex}_available`) === "on",
      });
    }

    const textMax = text(formData, `group_${groupIndex}_text_max`);
    const unit = text(formData, `group_${groupIndex}_unit`);
    const min = text(formData, `group_${groupIndex}_min`);
    const max = text(formData, `group_${groupIndex}_max`);
    const blank = label === "" && options.length === 0 && textMax === "" && unit === "" && min === "" && max === "";

    if (blank) {
      continue;
    }

    if (label === "") {
      errors.push(`Customization group ${groupIndex + 1} needs a label.`);
      continue;
    }

    const group: CustomizationGroup = {
      id: text(formData, `group_${groupIndex}_id`) || randomUUID(),
      label,
      kind,
      required: formData.get(`group_${groupIndex}_required`) === "on",
      options: kind === "text" || kind === "measurement" ? [] : options,
    };

    if (kind === "text" && textMax !== "") {
      group.textMaxLength = /^\d+$/.test(textMax) ? Number(textMax) : undefined;

      if (group.textMaxLength === undefined) {
        errors.push(`Customization group ${groupIndex + 1} needs a whole-number text limit.`);
      }
    }

    if (kind === "measurement") {
      if (unit === "in" || unit === "cm" || unit === "mm") {
        group.unit = unit;
      }

      group.min = optionalNumber(min, `Customization group ${groupIndex + 1} minimum`, errors);
      group.max = optionalNumber(max, `Customization group ${groupIndex + 1} maximum`, errors);
    }

    groups.push(group);
  }

  return groups;
}

function readKind(value: string): CustomizationKind {
  if (value === "multi" || value === "text" || value === "measurement") {
    return value;
  }

  return "single";
}

function optionalNumber(value: string, label: string, errors: string[]): number | undefined {
  if (value === "") {
    return undefined;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    errors.push(`${label} must be a number with up to two decimal places.`);
    return undefined;
  }

  return Number(value);
}

function readImages(formData: FormData, assetIds: readonly string[]): ImageInput[] {
  return assetIds.flatMap((assetId) => {
    if (formData.get(`image_${assetId}`) !== "on") {
      return [];
    }

    return [
      {
        assetId,
        depictsProduct: formData.get(`depict_${assetId}`) === "on",
      },
    ];
  });
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
