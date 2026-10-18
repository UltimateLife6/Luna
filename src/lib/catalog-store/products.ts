import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { CatalogStoreError } from "@/lib/catalog-store/errors";
import type { CatalogCategory, CatalogImageRef, CatalogProduct, CatalogVariant, CategoryInput, CustomizationGroup, ProductInput, ProductStatus, PurchaseMode } from "@/lib/catalog-store/types";
import { validateCategoryInput, validateProductInput } from "@/lib/catalog-store/validate";

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
  made_to_order: number;
  made_to_order_note: string;
  purchase_mode: string;
  customization_json: string;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  sku_assigned: number;
  currency: string;
  price_minor: number;
  inventory_count: number;
  position: number;
};

type ImageRow = {
  id: string;
  product_id: string;
  asset_id: string;
  depicts_product: number;
  position: number;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
};

export function listCategories(database: DatabaseSync): CatalogCategory[] {
  return database
    .prepare("SELECT id, slug, name, description, sort_order FROM categories ORDER BY sort_order, name")
    .all()
    .map((row) => {
      const category = row as unknown as CategoryRow;
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: category.sort_order,
      };
    });
}

export function listCatalogProducts(database: DatabaseSync, scope: "public" | "admin"): CatalogProduct[] {
  const where =
    scope === "public"
      ? "WHERE p.status = 'published' AND EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id)"
      : "";
  const order = scope === "public" ? "ORDER BY c.sort_order, p.name" : "ORDER BY p.updated_at DESC";
  const rows = database
    .prepare(
      `SELECT p.id, p.slug, p.name, p.summary, p.description, p.category_id,
              c.slug AS category_slug, c.name AS category_name, p.status,
              p.made_to_order, p.made_to_order_note, p.purchase_mode, p.customization_json,
              p.created_at, p.updated_at
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ${order}`,
    )
    .all() as unknown as ProductRow[];

  return hydrate(database, rows);
}

export function getCatalogProduct(database: DatabaseSync, id: string): CatalogProduct | undefined {
  const row = database
    .prepare(
      `SELECT p.id, p.slug, p.name, p.summary, p.description, p.category_id,
              c.slug AS category_slug, c.name AS category_name, p.status,
              p.made_to_order, p.made_to_order_note, p.purchase_mode, p.customization_json,
              p.created_at, p.updated_at
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
    )
    .get(id) as unknown as ProductRow | undefined;

  return row ? hydrate(database, [row])[0] : undefined;
}

export function getPublishedBySlug(database: DatabaseSync, slug: string): CatalogProduct | undefined {
  const product = listCatalogProducts(database, "public").find((item) => item.slug === slug);
  return product;
}

export function listRelatedPublished(database: DatabaseSync, product: CatalogProduct): CatalogProduct[] {
  return listCatalogProducts(database, "public")
    .filter((item) => item.categoryId === product.categoryId && item.id !== product.id)
    .slice(0, 2);
}

export function saveCatalogProduct(database: DatabaseSync, input: ProductInput, allowedAssetIds: readonly string[]): CatalogProduct {
  const categories = listCategories(database);
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
  const existing = input.id ? getCatalogProduct(database, input.id) : undefined;

  if (input.id && !existing) {
    throw new CatalogStoreError(["That catalog record was not found."]);
  }

  const productId = existing?.id ?? randomUUID();
  const slugOwner = database.prepare("SELECT id FROM products WHERE slug = ?").get(input.slug) as { id: string } | undefined;

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
    const owner = database.prepare("SELECT product_id FROM variants WHERE sku = ?").get(variant.sku) as { product_id: string } | undefined;

    if (owner && owner.product_id !== productId) {
      throw new CatalogStoreError([`SKU ${variant.sku} is already used by another local product.`]);
    }
  }

  database.exec("BEGIN");

  try {
    if (existing) {
      database
        .prepare(
          `UPDATE products
           SET slug = ?, name = ?, summary = ?, description = ?, category_id = ?, status = ?,
               made_to_order = ?, made_to_order_note = ?, purchase_mode = ?, customization_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(
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
        );
      database.prepare("DELETE FROM variants WHERE product_id = ?").run(productId);
      database.prepare("DELETE FROM product_images WHERE product_id = ?").run(productId);
    } else {
      database
        .prepare(
          `INSERT INTO products (
             id, slug, name, summary, description, category_id, status, made_to_order, made_to_order_note,
             purchase_mode, customization_json, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
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
        );
    }

    const insertVariant = database.prepare(
      `INSERT INTO variants (
         id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const variant of variantPlans) {
      insertVariant.run(
        variant.id,
        productId,
        variant.label,
        variant.sku,
        variant.skuAssigned,
        variant.currency,
        variant.priceMinor,
        variant.inventoryCount,
        variant.position,
      );
    }

    const insertImage = database.prepare(
      "INSERT INTO product_images (id, product_id, asset_id, depicts_product, position) VALUES (?, ?, ?, ?, ?)",
    );

    input.images.forEach((image, position) => {
      insertImage.run(randomUUID(), productId, image.assetId, image.depictsProduct ? 1 : 0, position);
    });

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const saved = getCatalogProduct(database, productId);

  if (!saved) {
    throw new CatalogStoreError(["The catalog record could not be read after saving."]);
  }

  return saved;
}

export function deleteCatalogProduct(database: DatabaseSync, id: string): void {
  const product = getCatalogProduct(database, id);

  if (!product) {
    throw new CatalogStoreError(["That catalog record was not found."]);
  }

  if (product.status === "published") {
    throw new CatalogStoreError(["Archive the product, or return it to draft, before deleting it."]);
  }

  database.prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function createCategory(database: DatabaseSync, input: CategoryInput): CatalogCategory {
  const errors = validateCategoryInput(input);

  if (errors.length > 0) {
    throw new CatalogStoreError(errors);
  }

  const slugOwner = database.prepare("SELECT id FROM categories WHERE slug = ?").get(input.slug) as { id: string } | undefined;

  if (slugOwner) {
    throw new CatalogStoreError(["That category slug is already used."]);
  }

  const sortOrder = listCategories(database).reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1;
  const category: CatalogCategory = {
    id: randomUUID(),
    slug: input.slug,
    name: input.name.trim(),
    description: input.description.trim(),
    sortOrder,
  };

  database
    .prepare("INSERT INTO categories (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)")
    .run(category.id, category.slug, category.name, category.description, category.sortOrder);

  return category;
}

function hydrate(database: DatabaseSync, rows: ProductRow[]): CatalogProduct[] {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const variants = database
    .prepare(
      `SELECT id, product_id, label, sku, sku_assigned, currency, price_minor, inventory_count, position
       FROM variants WHERE product_id IN (${placeholders}) ORDER BY position`,
    )
    .all(...ids) as unknown as VariantRow[];
  const images = database
    .prepare(
      `SELECT id, product_id, asset_id, depicts_product, position
       FROM product_images WHERE product_id IN (${placeholders}) ORDER BY position`,
    )
    .all(...ids) as unknown as ImageRow[];

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
    madeToOrder: row.made_to_order === 1,
    madeToOrderNote: row.made_to_order_note,
    purchaseMode: readPurchaseMode(row.purchase_mode),
    customizationGroups: readCustomization(row.customization_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants: variants.filter((variant) => variant.product_id === row.id).map(readVariant),
    images: images.filter((image) => image.product_id === row.id).map(readImage),
  }));
}

function readVariant(row: VariantRow): CatalogVariant {
  if (row.currency !== "USD") {
    throw new CatalogStoreError(["A stored variant uses a currency that is not confirmed."]);
  }

  return {
    id: row.id,
    label: row.label,
    sku: row.sku,
    skuAssigned: row.sku_assigned === 1,
    currency: "USD",
    priceMinor: row.price_minor,
    inventoryCount: row.inventory_count,
    position: row.position,
  };
}

function readImage(row: ImageRow): CatalogImageRef {
  return {
    id: row.id,
    assetId: row.asset_id,
    depictsProduct: row.depicts_product === 1,
    position: row.position,
  };
}

function readPurchaseMode(value: string): PurchaseMode {
  if (value === "quote-only" || value === "checkout") {
    return value;
  }

  throw new CatalogStoreError(["A stored product has an unknown purchase mode."]);
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

function readStatus(value: string): ProductStatus {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  throw new CatalogStoreError(["A stored product has an unknown status."]);
}
