import type { Product, ProductCategory } from "@/types/catalog";
import { productCategories } from "@/types/catalog";

export const categories: readonly { slug: ProductCategory; title: string }[] = [
  { slug: "accessories", title: "Leather Accessories" },
  { slug: "masks", title: "Masks & Headpieces" },
  { slug: "harnesses", title: "Harnesses" },
  { slug: "fantasy", title: "Fantasy-Inspired Leatherwork" },
];

export type ShopFilters = {
  q: string;
  category?: ProductCategory;
  /** Original category param, including values that are not in the catalog. */
  rawCategory: string;
  categoryIsUnknown: boolean;
};

export function isProductCategory(value: string): value is ProductCategory {
  return productCategories.some((category) => category === value);
}

export function categoryTitle(slug: ProductCategory): string {
  return categories.find((category) => category.slug === slug)?.title ?? slug;
}

export function shopPath(filters: { category?: string; q?: string } = {}): string {
  const params = new URLSearchParams();
  const category = filters.category?.trim();
  const q = filters.q?.trim();

  if (category) {
    params.set("category", category);
  }

  if (q) {
    params.set("q", q);
  }

  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

export function readShopFilters(params: Record<string, string | string[] | undefined>): ShopFilters {
  const q = firstParam(params.q).trim().slice(0, 80);
  const rawCategory = firstParam(params.category).trim();

  if (!rawCategory) {
    return { q, rawCategory: "", categoryIsUnknown: false };
  }

  if (isProductCategory(rawCategory)) {
    return { q, category: rawCategory, rawCategory, categoryIsUnknown: false };
  }

  return { q, rawCategory, categoryIsUnknown: true };
}

export function filterProducts(products: readonly Product[], filters: ShopFilters): Product[] {
  if (filters.categoryIsUnknown) {
    return [];
  }

  const query = filters.q.toLowerCase();

  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    if (!query) {
      return true;
    }

    return searchText(product).includes(query);
  });
}

export function customizationIndicator(product: Product): string | undefined {
  const groups = product.customization;

  if (!groups?.length) {
    return undefined;
  }

  return `Example options for ${joinLabels(groups.map((group) => group.label.toLowerCase()))}.`;
}

export function etsyHref(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname === "www.etsy.com") {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function searchText(product: Product): string {
  const options = product.customization?.flatMap((group) => [group.label, ...group.options.map((option) => option.label)]) ?? [];

  return [product.name, product.summary, product.description, categoryTitle(product.category), ...options]
    .join(" ")
    .toLowerCase();
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
