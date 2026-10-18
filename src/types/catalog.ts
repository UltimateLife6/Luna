/** Demo records are placeholders. Verified records are approved Luna Fae material. */
export type RecordStatus = "demo" | "verified";

export const productCategories = ["accessories", "masks", "harnesses", "fantasy"] as const;

export type ProductCategory = (typeof productCategories)[number];

export type ImageSource = "local" | "concept";

export type ImageApproval = "approved" | "concept";

export type CatalogImage = {
  /**
   * Public path such as `/images/collar-01.jpg`.
   * Omit for a concept frame. Remote and hotlinked URLs are not accepted.
   */
  src?: string;
  alt: string;
  source: ImageSource;
  approval: ImageApproval;
  label?: string;
};

export type CustomizationKind = "leather-color" | "hardware" | "sizing";

export type CustomizationOption = {
  id: string;
  label: string;
};

export type CustomizationGroup = {
  kind: CustomizationKind;
  label: string;
  /** States that the options are illustrative, not a confirmed production palette. */
  note: string;
  options: CustomizationOption[];
};

export type Product = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: ProductCategory;
  status: RecordStatus;
  /**
   * Fictional interface examples stay unattributed.
   * Verified listings are the only records that may name the maker's work.
   */
  attribution: "fictional-example" | "verified-listing";
  images: CatalogImage[];
  /** Individually verified listing URL. Never inferred from the shop name. */
  etsyUrl?: string;
  customizationNotes?: string;
  customization?: CustomizationGroup[];
  sizingNotes?: string;
};

export type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  category?: string;
  /** Factual frame label. Not a product name. */
  label?: string;
  status: RecordStatus;
  aspectClassName?: string;
  objectPosition?: string;
};

export type Appearance = {
  id: string;
  name: string;
  status: "upcoming" | "past";
  verification: RecordStatus;
  location?: string;
  /** Human-readable date supplied with the record. Do not invent one. */
  dateLabel?: string;
  summary?: string;
};
