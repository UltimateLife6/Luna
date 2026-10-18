import { imageAssets } from "@/data/image-assets";
import type { CatalogAssetRecord } from "@/lib/catalog-store/present";

export function findCatalogAsset(id: string): CatalogAssetRecord | undefined {
  const asset = imageAssets.find((item) => item.id === id);

  if (!asset) {
    return undefined;
  }

  return {
    id: asset.id,
    publicFilename: asset.publicFilename,
    alt: asset.alt,
    shortLabel: asset.shortLabel,
    objectPosition: asset.objectPosition,
  };
}

export function catalogAssetIds(): string[] {
  return imageAssets.map((asset) => asset.id);
}

export function catalogAssetChoices(): { id: string; shortLabel: string }[] {
  return imageAssets.map((asset) => ({ id: asset.id, shortLabel: asset.shortLabel }));
}
