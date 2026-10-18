export const productStatuses = ["draft", "published", "archived"] as const;

export const purchaseModes = ["quote-only", "checkout"] as const;

export type PurchaseMode = (typeof purchaseModes)[number];

export const customizationKinds = ["single", "multi", "text", "measurement"] as const;

export type CustomizationKind = (typeof customizationKinds)[number];

export const measurementUnits = ["in", "cm", "mm"] as const;

export type MeasurementUnit = (typeof measurementUnits)[number];

export type CustomizationOption = {
  id: string;
  label: string;
  priceAdjustmentMinor: number;
  available?: boolean;
};

export type CustomizationGroup = {
  id: string;
  label: string;
  kind?: CustomizationKind;
  required?: boolean;
  options: CustomizationOption[];
  unit?: MeasurementUnit;
  min?: number;
  max?: number;
  textMaxLength?: number;
};

export type ProductStatus = (typeof productStatuses)[number];

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type CatalogVariant = {
  id: string;
  label: string;
  sku: string;
  skuAssigned: boolean;
  currency: "USD";
  priceMinor: number;
  inventoryCount: number;
  position: number;
};

export type CatalogImageRef = {
  id: string;
  assetId: string;
  depictsProduct: boolean;
  position: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  status: ProductStatus;
  madeToOrder: boolean;
  madeToOrderNote: string;
  purchaseMode: PurchaseMode;
  customizationGroups: CustomizationGroup[];
  variants: CatalogVariant[];
  images: CatalogImageRef[];
  createdAt: string;
  updatedAt: string;
};

export type VariantInput = {
  id?: string;
  label: string;
  sku: string;
  currency: "USD";
  priceMinor: number;
  inventoryCount: number;
};

export type ImageInput = {
  assetId: string;
  depictsProduct: boolean;
};

export type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: string;
  status: ProductStatus;
  madeToOrder: boolean;
  madeToOrderNote: string;
  purchaseMode?: PurchaseMode;
  customizationGroups?: CustomizationGroup[];
  variants: VariantInput[];
  images: ImageInput[];
};

export type CategoryInput = {
  name: string;
  slug: string;
  description: string;
};
