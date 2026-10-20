import type { Product } from "@/types/catalog";

/** Published shop listings. Nothing is invented here. */
export const products: Product[] = [];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(slug: string): Product[] {
  const product = getProduct(slug);

  if (!product) {
    return [];
  }

  return products.filter((item) => item.slug !== product.slug && item.category === product.category);
}
