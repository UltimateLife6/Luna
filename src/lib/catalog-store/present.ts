import { availabilityFor, availabilityForVariants } from "@/lib/catalog-store/availability";
import { formatMinorUnits, formatPriceRange } from "@/lib/catalog-store/money";
import type { CatalogProduct, CustomizationKind, PurchaseMode } from "@/lib/catalog-store/types";
import { measurementUnitName } from "@/lib/commerce/selection";

export type CatalogAssetRecord = {
  id: string;
  publicFilename?: string;
  src?: string;
  alt?: string;
  shortLabel: string;
  objectPosition: string;
};

export type PublicCatalogImage = {
  assetId: string;
  src?: string;
  alt: string;
  label: string;
  objectPosition: string;
  caption: string;
  depictsProduct: boolean;
};

export type PublicCatalogVariant = {
  id: string;
  label: string;
  skuLabel: string;
  priceLabel: string;
  priceMinor: number;
  availabilityLabel: string;
  inventoryCount: number;
};

export type PublicCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  categoryName: string;
  priceLabel: string;
  availabilityLabel: string;
  madeToOrder: boolean;
  madeToOrderNote: string;
  purchaseMode: PurchaseMode;
  customization: PublicCustomizationGroup[];
  variants: PublicCatalogVariant[];
  images: PublicCatalogImage[];
};

export type PublicCustomizationGroup = {
  id: string;
  label: string;
  kind: CustomizationKind;
  required: boolean;
  unit?: "in" | "cm" | "mm";
  unitName?: string;
  min?: number;
  max?: number;
  textMaxLength?: number;
  options: { id: string; label: string; adjustmentLabel: string; adjustmentMinor: number; available: boolean }[];
};

export type PublicCatalogCard = {
  slug: string;
  name: string;
  categoryName: string;
  priceLabel: string;
  availabilityLabel: string;
  image: PublicCatalogImage | null;
};

export function presentPublishedProduct(
  product: CatalogProduct,
  findAsset: (id: string) => CatalogAssetRecord | undefined,
): PublicCatalogProduct | null {
  if (product.status !== "published") {
    return null;
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    summary: product.summary,
    description: product.description,
    categoryName: product.categoryName,
    priceLabel: formatPriceRange(product.variants),
    availabilityLabel: availabilityForVariants(product.madeToOrder, product.variants).text,
    madeToOrder: product.madeToOrder,
    madeToOrderNote: product.madeToOrderNote.trim(),
    purchaseMode: product.purchaseMode,
    customization: product.customizationGroups.map((group) => ({
      id: group.id,
      label: group.label,
      kind: group.kind ?? "single",
      required: group.required ?? true,
      unit: group.unit,
      unitName: group.unit ? measurementUnitName(group.unit) : undefined,
      min: group.min,
      max: group.max,
      textMaxLength: group.textMaxLength,
      options: group.options.map((option) => ({
        id: option.id,
        label: option.label,
        adjustmentMinor: option.priceAdjustmentMinor,
        available: option.available !== false,
        adjustmentLabel:
          option.priceAdjustmentMinor === 0 ? "No added charge is saved." : formatMinorUnits(option.priceAdjustmentMinor, "USD"),
      })),
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      skuLabel: variant.skuAssigned ? variant.sku : "SKU not assigned",
      priceLabel: formatMinorUnits(variant.priceMinor, variant.currency),
      priceMinor: variant.priceMinor,
      availabilityLabel: availabilityFor(product.madeToOrder, variant.inventoryCount).text,
      inventoryCount: variant.inventoryCount,
    })),
    images: product.images.flatMap((image) => {
      const presented = presentImage(image.assetId, image.depictsProduct, findAsset);
      return presented ? [presented] : [];
    }),
  };
}

export function presentPublishedCard(
  product: CatalogProduct,
  findAsset: (id: string) => CatalogAssetRecord | undefined,
): PublicCatalogCard | null {
  const view = presentPublishedProduct(product, findAsset);

  if (!view) {
    return null;
  }

  return {
    slug: view.slug,
    name: view.name,
    categoryName: view.categoryName,
    priceLabel: view.priceLabel,
    availabilityLabel: view.availabilityLabel,
    image: view.images.find((image) => image.depictsProduct) ?? null,
  };
}

function presentImage(
  assetId: string,
  depictsProduct: boolean,
  findAsset: (id: string) => CatalogAssetRecord | undefined,
): PublicCatalogImage | null {
  const asset = findAsset(assetId);

  if (!asset) {
    return null;
  }

  return {
    assetId,
    src: asset.src ?? referenceSrc(asset.publicFilename),
    alt: asset.alt?.trim() || asset.shortLabel,
    label: asset.shortLabel,
    objectPosition: asset.objectPosition || "center",
    depictsProduct,
    caption: depictsProduct
      ? "The catalog editor marked this photograph as depicting the product. Public publication, photographer credit, and model permission stay unverified."
      : "Reference only. This photograph is not verified as the product.",
  };
}

/** Ledger filename only. Display still goes through the private-preview gate. */
function referenceSrc(filename: string | undefined): string | undefined {
  if (!filename || !/^[\w.-]+$/.test(filename)) {
    return undefined;
  }

  return `/images/${filename}`;
}
