import { assetById, galleryOrder } from "@/data/image-assets";
import type { GalleryItem } from "@/types/catalog";

/**
 * Supplied photographs in display order.
 * A frame is rendered only when `displayPath` allows its ledger status in this runtime.
 * `category` is a visual filter, not a product name.
 */
export const galleryItems: GalleryItem[] = galleryOrder.map((id) => {
  const asset = assetById(id);

  if (!asset?.alt || !asset.publicFilename) {
    throw new Error(`Gallery photograph ${id} is missing an alt text or public filename.`);
  }

  return {
    id: asset.id,
    src: `/images/${asset.publicFilename}`,
    alt: asset.alt,
    label: asset.shortLabel,
    category: asset.galleryFilter,
    status: "demo",
    aspectClassName: "aspect-square",
    objectPosition: asset.objectPosition,
  };
});
