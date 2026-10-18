import type { DatabaseSync } from "node:sqlite";
import { isPrivatePreviewId } from "@/lib/platform/media-policy";
import { isMigratableCatalogSlug } from "@/lib/platform/catalog-filter";
import type { Sql } from "@/lib/platform/sql";

export type ImportResult = {
  categories: number;
  products: number;
  skippedProducts: number;
  skippedImages: number;
  quotes: number;
  shippingRates: number;
};

export async function importSqliteCatalog(source: DatabaseSync, destination: Sql): Promise<ImportResult> {
  const result: ImportResult = { categories: 0, products: 0, skippedProducts: 0, skippedImages: 0, quotes: 0, shippingRates: 0 };
  const categories = source.prepare("SELECT id, slug, name, description, sort_order FROM categories").all() as Record<string, unknown>[];

  for (const category of categories) {
    const inserted = await destination.execute(
      `INSERT INTO categories (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [category.id, category.slug, category.name, category.description, category.sort_order],
    );
    result.categories += inserted.changes;
  }

  const products = source.prepare("SELECT * FROM products").all() as Record<string, unknown>[];
  const kept = new Set<string>();

  for (const product of products) {
    const slug = String(product.slug);

    if (!isMigratableCatalogSlug(slug)) {
      result.skippedProducts += 1;
      continue;
    }

    const inserted = await destination.execute(
      `INSERT INTO products (
         id, slug, name, summary, description, category_id, status, made_to_order, made_to_order_note,
         purchase_mode, customization_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        product.id,
        product.slug,
        product.name,
        product.summary,
        product.description,
        product.category_id,
        product.status,
        product.made_to_order,
        product.made_to_order_note,
        product.purchase_mode ?? "quote-only",
        product.customization_json ?? "[]",
        product.created_at,
        product.updated_at,
      ],
    );

    if (inserted.changes === 1) {
      result.products += 1;
      kept.add(String(product.id));
    }
  }

  const variants = source.prepare("SELECT * FROM variants").all() as Record<string, unknown>[];

  for (const variant of variants) {
    if (!kept.has(String(variant.product_id))) {
      continue;
    }

    await destination.execute(
      `INSERT INTO variants (
         id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [variant.id, variant.product_id, variant.label, variant.sku, variant.sku_assigned, variant.currency, variant.price_minor, variant.inventory_count, variant.position],
    );
  }

  const images = source.prepare("SELECT * FROM product_images").all() as Record<string, unknown>[];

  for (const image of images) {
    if (!kept.has(String(image.product_id))) {
      continue;
    }

    if (isPrivatePreviewId(String(image.asset_id))) {
      result.skippedImages += 1;
      continue;
    }

    await destination.execute(
      `INSERT INTO product_images (id, product_id, asset_id, depicts_product, position) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [image.id, image.product_id, image.asset_id, image.depicts_product, image.position],
    );
  }

  const quotes = source.prepare("SELECT * FROM quote_requests").all() as Record<string, unknown>[];

  for (const quote of quotes) {
    if (quote.product_id && !kept.has(String(quote.product_id))) {
      continue;
    }

    const inserted = await destination.execute(
      `INSERT INTO quote_requests (
         id, product_id, product_name, contact_name, email, details, status, admin_note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [quote.id, quote.product_id, quote.product_name, quote.contact_name, quote.email, quote.details, quote.status, quote.admin_note, quote.created_at, quote.updated_at],
    );
    result.quotes += inserted.changes;
  }

  const rates = source.prepare("SELECT * FROM shipping_rates").all() as Record<string, unknown>[];

  for (const rate of rates) {
    const inserted = await destination.execute(
      `INSERT INTO shipping_rates (id, label, amount_minor, currency, countries_json, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [rate.id, rate.label, rate.amount_minor, rate.currency, rate.countries_json, rate.active, rate.created_at],
    );
    result.shippingRates += inserted.changes;
  }

  return result;
}
