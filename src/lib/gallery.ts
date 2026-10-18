import { displayPath } from "@/data/image-assets";
import { galleryItems } from "@/data/gallery";
import type { GalleryItem, RecordStatus } from "@/types/catalog";

export const galleryCategories = [
  { id: "all", label: "All" },
  { id: "accessories", label: "Accessories" },
  { id: "masks", label: "Masks" },
  { id: "harnesses", label: "Harnesses" },
  { id: "fantasy", label: "Fantasy" },
  { id: "detail", label: "Detail" },
] as const;

export type GalleryCategory = (typeof galleryCategories)[number]["id"];

export type GalleryFrame = {
  id: string;
  alt: string;
  category: Exclude<GalleryCategory, "all">;
  label: string;
  aspectClassName: string;
  src?: string;
  objectPosition?: string;
  usage?: "private-preview";
  status: RecordStatus | "concept";
};

/**
 * Named compositions for a future approved portfolio.
 * These are not photographs and they are not catalog entries.
 */
export const conceptGalleryFrames: GalleryFrame[] = [
  {
    id: "slot-accessory-wide",
    category: "accessories",
    label: "Accessory frame",
    aspectClassName: "aspect-[4/3]",
    alt: "Concept frame reserved for an accessory photograph. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-mask-portrait",
    category: "masks",
    label: "Mask frame",
    aspectClassName: "aspect-[3/4]",
    alt: "Concept frame reserved for a mask or headpiece photograph. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-harness-tall",
    category: "harnesses",
    label: "Harness frame",
    aspectClassName: "aspect-[4/5]",
    alt: "Concept frame reserved for a harness photograph. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-fantasy-wide",
    category: "fantasy",
    label: "Fantasy frame",
    aspectClassName: "aspect-[5/4]",
    alt: "Concept frame reserved for fantasy leatherwork. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-detail-square",
    category: "detail",
    label: "Detail frame",
    aspectClassName: "aspect-square",
    alt: "Concept frame reserved for a material or hardware detail. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-accessory-portrait",
    category: "accessories",
    label: "Second accessory frame",
    aspectClassName: "aspect-[3/4]",
    alt: "Second concept frame reserved for an accessory photograph. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-mask-wide",
    category: "masks",
    label: "Second mask frame",
    aspectClassName: "aspect-[4/3]",
    alt: "Second concept frame reserved for a mask or headpiece photograph. No Luna Fae piece is shown.",
    status: "concept",
  },
  {
    id: "slot-fantasy-portrait",
    category: "fantasy",
    label: "Second fantasy frame",
    aspectClassName: "aspect-[3/4]",
    alt: "Second concept frame reserved for fantasy leatherwork. No Luna Fae piece is shown.",
    status: "concept",
  },
];

export function categoryLabel(id: GalleryCategory): string {
  return galleryCategories.find((category) => category.id === id)?.label ?? "Gallery";
}

export function galleryFrames(): GalleryFrame[] {
  const approved = galleryItems.map(frameFromItem).filter((frame) => frame.src);

  return approved.length > 0 ? approved : conceptGalleryFrames;
}

export function isConceptGallery(): boolean {
  return galleryItems.every((item) => !displayPath(item.src));
}

function frameFromItem(item: GalleryItem): GalleryFrame {
  const src = displayPath(item.src);

  return {
    id: item.id,
    alt: item.alt,
    category: categoryFromRecord(item.category),
    label: item.label?.trim() || item.category?.trim() || "Gallery photograph",
    aspectClassName: item.aspectClassName ?? "aspect-square",
    objectPosition: item.objectPosition,
    src,
    usage: src?.startsWith("/private-preview/") ? "private-preview" : undefined,
    status: src ? item.status : "concept",
  };
}

function categoryFromRecord(value: string | undefined): Exclude<GalleryCategory, "all"> {
  const raw = value?.toLowerCase() ?? "";

  if (raw.includes("mask") || raw.includes("head")) {
    return "masks";
  }

  if (raw.includes("harness")) {
    return "harnesses";
  }

  if (raw.includes("fantas")) {
    return "fantasy";
  }

  if (raw.includes("accessor") || raw.includes("collar")) {
    return "accessories";
  }

  if (raw.includes("detail")) {
    return "detail";
  }

  return "detail";
}
