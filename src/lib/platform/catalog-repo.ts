import { randomUUID } from "node:crypto";
import { CatalogStoreError } from "@/lib/catalog-store/errors";
import type { CatalogCategory, CatalogImageRef, CatalogProduct, CatalogVariant, CategoryInput, CustomizationGroup, ProductInput, ProductStatus, PurchaseMode } from "@/lib/catalog-store/types";
import { validateCategoryInput, validateProductInput } from "@/lib/catalog-store/validate";
import { integer, one, type Sql } from "@/lib/platform/sql";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  status: string;
  made_to_order: unknown;
  made_to_order_note: string;
  purchase_mode: string;
  customization_json: string;
  created_at: string;
  updated_at: string;
};

const productSelect = `
  SELECT p.id, p.slug, p.name, p.summary, p.description, p.category_id,
         c.slug AS category_slug, c.name AS category_name, p.status,
         p.made_to_order, p.made_to_order_note, p.purchase_mode, p.customization_json,
         p.created_at, p.updated_at
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

export async function listCategories(sql: Sql): Promise<CatalogCategory[]> {
  const rows = await sql.query<{ id: string; slug: string; name: string; description: string; sort_order: unknown }>(
    "SELECT id, slug, name, description, sort_order FROM categories ORDER BY sort_order, name",
  );

  return rows.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    sortOrder: integer(category.sort_order),
  }));
}

export async function listCatalogProducts(sql: Sql, scope: "public" | "admin"): Promise<CatalogProduct[]> {
  const where = scope === "public" ? "WHERE p.status = 'published' AND EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id)" : "";
  const order = scope === "public" ? "ORDER BY c.sort_order, p.name" : "ORDER BY p.updated_at DESC";
  const rows = await sql.query<ProductRow>(`${productSelect} ${where} ${order}`);
  return hydrate(sql, rows);
}

export async function getCatalogProduct(sql: Sql, id: string): Promise<CatalogProduct | undefined> {
  const row = await one<ProductRow>(sql, `${productSelect} WHERE p.id = ?`, [id]);
  return row ? (await hydrate(sql, [row]))[0] : undefined;
}

export async function getPublishedBySlug(sql: Sql, slug: string): Promise<CatalogProduct | undefined> {
  const products = await listCatalogProducts(sql, "public");
  return products.find((item) => item.slug === slug);
}

export async function listRelatedPublished(sql: Sql, product: CatalogProduct): Promise<CatalogProduct[]> {
  const products = await listCatalogProducts(sql, "public");
  return products.filter((item) => item.categoryId === product.categoryId && item.id !== product.id).slice(0, 2);
}

export async function saveCatalogProduct(sql: Sql, input: ProductInput, allowedAssetIds: readonly string[]): Promise<CatalogProduct> {
  const categories = await listCategories(sql);
  const errors = validateProductInput(input, {
    categoryIds: categories.map((category) => category.id),
    assetIds: allowedAssetIds,
  });

  if (errors.length > 0) {
    throw new CatalogStoreError(errors);
  }

  const now = new Date().toISOString();
  const purchaseMode = input.purchaseMode ?? "quote-only";
  const customizationJson = JSON.stringify(input.customizationGroups ?? []);
  const existing = input.id ? await getCatalogProduct(sql, input.id) : undefined;

  if (input.id && !existing) {
    throw new CatalogStoreError(["That catalog record was not found."]);
  }

  const productId = existing?.id ?? randomUUID();
  const slugOwner = await one<{ id: string }>(sql, "SELECT id FROM products WHERE slug = ?", [input.slug]);

  if (slugOwner && slugOwner.id !== productId) {
    throw new CatalogStoreError(["That slug is already used by another local product."]);
  }

  const variantPlans = input.variants.map((variant, position) => {
    const id = variant.id && existing?.variants.some((item) => item.id === variant.id) ? variant.id : randomUUID();
    const assigned = variant.sku.trim().length > 0;
    return {
      id,
      label: variant.label.trim(),
      sku: assigned ? variant.sku.trim() : `local-${id}`,
      skuAssigned: assigned ? 1 : 0,
      currency: "USD" as const,
      priceMinor: variant.priceMinor,
      inventoryCount: variant.inventoryCount,
      position,
    };
  });

  for (const variant of variantPlans) {
    const owner = await one<{ product_id: string }>(sql, "SELECT product_id FROM variants WHERE sku = ?", [variant.sku]);

    if (owner && owner.product_id !== productId) {
      throw new CatalogStoreError([`SKU ${variant.sku} is already used by another local product.`]);
    }
  }

  await sql.transaction(async (tx) => {
    if (existing) {
      await tx.execute(
        `UPDATE products
         SET slug = ?, name = ?, summary = ?, description = ?, category_id = ?, status = ?,
             made_to_order = ?, made_to_order_note = ?, purchase_mode = ?, customization_json = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.slug,
          input.name.trim(),
          input.summary.trim(),
          input.description.trim(),
          input.categoryId,
          input.status,
          input.madeToOrder ? 1 : 0,
          input.madeToOrderNote.trim(),
          purchaseMode,
          customizationJson,
          now,
          productId,
        ],
      );
      await tx.execute("DELETE FROM variants WHERE product_id = ?", [productId]);
      await tx.execute("DELETE FROM product_images WHERE product_id = ?", [productId]);
    } else {
      await tx.execute(
        `INSERT INTO products (
           id, slug, name, summary, description, category_id, status, made_to_order, made_to_order_note,
           purchase_mode, customization_json, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          input.slug,
          input.name.trim(),
          input.summary.trim(),
          input.description.trim(),
          input.categoryId,
          input.status,
          input.madeToOrder ? 1 : 0,
          input.madeToOrderNote.trim(),
          purchaseMode,
          customizationJson,
          now,
          now,
        ],
      );
    }

    for (const variant of variantPlans) {
      await tx.execute(
        `INSERT INTO variants (
           id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [variant.id, productId, variant.label, variant.sku, variant.skuAssigned, variant.currency, variant.priceMinor, variant.inventoryCount, variant.position],
      );
    }

    for (const [position, image] of input.images.entries()) {
      await tx.execute("INSERT INTO product_images (id, product_id, asset_id, depicts_product, position) VALUES (?, ?, ?, ?, ?)", [
        randomUUID(),
        productId,
        image.assetId,
        image.depictsProduct ? 1 : 0,
        position,
      ]);
    }
  });

  const saved = await getCatalogProduct(sql, productId);

  if (!saved) {
    throw new CatalogStoreError(["The catalog record could not be read after saving."]);
  }

  return saved;
}

export async function deleteCatalogProduct(sql: Sql, id: string): Promise<void> {
  const product = await getCatalogProduct(sql, id);

  if (!product) {
    throw new CatalogStoreError(["That catalog record was not found."]);
  }

  if (product.status === "published") {
    throw new CatalogStoreError(["Archive the product, or return it to draft, before deleting it."]);
  }

  await sql.execute("DELETE FROM products WHERE id = ?", [id]);
}

export async function createCategory(sql: Sql, input: CategoryInput): Promise<CatalogCategory> {
  const errors = validateCategoryInput(input);

  if (errors.length > 0) {
    throw new CatalogStoreError(errors);
  }

  const slugOwner = await one(sql, "SELECT id FROM categories WHERE slug = ?", [input.slug]);

  if (slugOwner) {
    throw new CatalogStoreError(["That category slug is already used."]);
  }

  const categories = await listCategories(sql);
  const sortOrder = categories.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1;
  const category: CatalogCategory = {
    id: randomUUID(),
    slug: input.slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sortOrder,
  };

  await sql.execute("INSERT INTO categories (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)", [
    category.id,
    category.slug,
    category.name,
    category.description,
    category.sortOrder,
  ]);

  return category;
}

async function hydrate(sql: Sql, rows: ProductRow[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const variants = await sql.query<Record<string, unknown>>(
    `SELECT id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position
     FROM variants WHERE product_id IN (${placeholders}) ORDER BY position`,
    ids,
  );
  const images = await sql.query<Record<string, unknown>>(
    `SELECT id, product_id, asset_id, depicts_product, position
     FROM product_images WHERE product_id IN (${placeholders}) ORDER BY position`,
    ids,
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    status: readStatus(row.status),
    madeToOrder: integer(row.made_to_order) === 1,
    madeToOrderNote: row.made_to_order_note,
    purchaseMode: readPurchaseMode(row.purchase_mode),
    customizationGroups: readCustomization(row.customization_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants: variants.filter((variant) => variant.product_id === row.id).map(readVariant),
    images: images.filter((image) => image.product_id === row.id).map(readImage),
  }));
}

function readVariant(row: Record<string, unknown>): CatalogVariant {
  if (row.currency !== "USD") {
    throw new CatalogStoreError(["A stored variant uses a currency that is not confirmed."]);
  }

  return {
    id: String(row.id),
    label: String(row.label),
    sku: String(row.sku),
    skuAssigned: integer(row.sku_assigned) === 1,
    currency: "USD",
    priceMinor: integer(row.price_minor),
    inventoryCount: integer(row.inventory_count),
    position: integer(row.position),
  };
}

function readImage(row: Record<string, unknown>): CatalogImageRef {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    depictsProduct: integer(row.depicts_product) === 1,
    position: integer(row.position),
  };
}

function readPurchaseMode(value: string): PurchaseMode {
  if (value === "quote-only" || value === "checkout") {
    return value;
  }

  throw new CatalogStoreError(["A stored product has an unknown purchase mode."]);
}

function readStatus(value: string): ProductStatus {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  throw new CatalogStoreError(["A stored product has an unknown status."]);
}

function readCustomization(value: string): CustomizationGroup[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new CatalogStoreError(["A stored product has customization that could not be read."]);
  }

  if (!Array.isArray(parsed)) {
    throw new CatalogStoreError(["A stored product has customization that could not be read."]);
  }

  return parsed.map((group) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new CatalogStoreError(["A stored product has customization that could not be read."]);
    }

    const record = group as CustomizationGroup;

    return {
      ...record,
      kind: record.kind ?? "single",
      required: record.required ?? true,
      options: Array.isArray(record.options) ? record.options.map((option) => ({ ...option, available: option.available !== false })) : [],
    };
  });
}
