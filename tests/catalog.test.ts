import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { products } from "@/data/products";
import { adminAccess } from "@/lib/catalog-store/auth";
import { availabilityFor, availabilityForVariants } from "@/lib/catalog-store/availability";
import { seededCategories } from "@/lib/catalog-store/categories";
import { openCatalogDatabase } from "@/lib/catalog-store/db";
import { CatalogStoreError } from "@/lib/catalog-store/errors";
import { productInputFromForm } from "@/lib/catalog-store/form";
import { formatMinorUnits, formatPriceRange } from "@/lib/catalog-store/money";
import { presentPublishedCard, presentPublishedProduct } from "@/lib/catalog-store/present";
import {
  createCategory,
  deleteCatalogProduct,
  getPublishedBySlug,
  listCatalogProducts,
  listCategories,
  saveCatalogProduct,
} from "@/lib/catalog-store/products";
import type { ProductInput } from "@/lib/catalog-store/types";
import type { DatabaseSync } from "node:sqlite";

const categoryId = seededCategories[0].id;
const assetIds = ["img-5249", "img-5250"];

function withDatabase(run: (database: DatabaseSync) => void): void {
  const database = openCatalogDatabase(":memory:");

  try {
    run(database);
  } finally {
    database.close();
  }
}

function sampleInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Test collar record",
    slug: "test-collar-record",
    summary: "A local catalog record created for a test.",
    description: "This description exists only inside the test database.",
    categoryId,
    status: "draft",
    madeToOrder: false,
    madeToOrderNote: "",
    variants: [
      {
        label: "One size",
        sku: "TEST-COLLAR",
        currency: "USD",
        priceMinor: 12500,
        inventoryCount: 2,
      },
    ],
    images: [],
    ...overrides,
  };
}

describe("money", () => {
  it("formats integer cents as USD", () => {
    assert.equal(formatMinorUnits(0), "$0.00");
    assert.equal(formatMinorUnits(12500), "$125.00");
    assert.equal(formatPriceRange([{ priceMinor: 4000, currency: "USD" }, { priceMinor: 6000, currency: "USD" }]), "$40.00–$60.00");
  });

  it("rejects decimal and non-USD amounts", () => {
    assert.throws(() => formatMinorUnits(12.5), /minor units/);
    assert.throws(() => formatMinorUnits(100, "EUR"), /USD/);
  });
});

describe("availability", () => {
  it("states stock, made-to-order, and an unknown empty variant list", () => {
    assert.equal(availabilityFor(false, 2).code, "in-stock");
    assert.equal(availabilityFor(false, 0).text, "Out of stock in the local catalog.");
    assert.match(availabilityFor(true, 0).text, /Made to order/);
    assert.match(availabilityFor(true, 1).text, /1 finished piece/);
    assert.equal(availabilityForVariants(false, []).code, "unknown");
  });
});

describe("admin access", () => {
  it("requires a configured owner or admin session", () => {
    assert.equal(adminAccess({ configured: false, role: "owner" }), "closed");
    assert.equal(adminAccess({ configured: true, role: null }), "anonymous");
    assert.equal(adminAccess({ configured: true, role: "guest" }), "closed");
    assert.equal(adminAccess({ configured: true, role: "admin" }), "ready");
    assert.equal(adminAccess({ configured: true, role: "owner" }), "ready");
  });
});

describe("product form", () => {
  it("keeps the price in minor units and rejects a decimal", () => {
    const form = new FormData();
    form.set("name", "Test collar record");
    form.set("slug", "test-collar-record");
    form.set("summary", "A local catalog record created for a test.");
    form.set("description", "This description exists only inside the test database.");
    form.set("categoryId", categoryId);
    form.set("status", "published");
    form.set("variant_0_label", "One size");
    form.set("variant_0_price", "12.50");
    form.set("variant_0_inventory", "1");

    const parsed = productInputFromForm(form, { categoryIds: [categoryId], assetIds });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.match(parsed.errors.join(" "), /minor units/);
    }
  });
});

describe("catalog database", () => {
  it("starts with browsing categories and no products", () => {
    withDatabase((database) => {
      assert.deepEqual(
        listCategories(database).map((category) => category.slug),
        seededCategories.map((category) => category.slug),
      );
      assert.equal(listCatalogProducts(database, "admin").length, 0);
      const stored = new Set(listCatalogProducts(database, "admin").map((product) => product.slug));

      for (const product of products) {
        assert.equal(stored.has(product.slug), false);
        assert.equal(product.attribution, "fictional-example");
      }
    });
  });

  it("hides drafts, stores integer prices, and publishes accurate availability", () => {
    withDatabase((database) => {
      const draft = saveCatalogProduct(database, sampleInput(), assetIds);
      assert.equal(draft.variants[0]?.priceMinor, 12500);
      assert.equal(Number.isInteger(draft.variants[0]?.priceMinor), true);
      assert.equal(draft.variants[0]?.skuAssigned, true);
      assert.equal(listCatalogProducts(database, "public").length, 0);
      assert.equal(getPublishedBySlug(database, draft.slug), undefined);

      const published = saveCatalogProduct(
        database,
        sampleInput({
          id: draft.id,
          status: "published",
          madeToOrder: true,
          madeToOrderNote: "Entered by the test, not a confirmed lead time.",
          variants: [{ label: "One size", sku: "", currency: "USD", priceMinor: 12500, inventoryCount: 0 }],
          images: [
            { assetId: "img-5249", depictsProduct: false },
            { assetId: "img-5250", depictsProduct: true },
          ],
        }),
        assetIds,
      );

      assert.equal(published.variants[0]?.skuAssigned, false);
      assert.equal(published.variants[0]?.inventoryCount, 0);
      assert.equal(published.images[1]?.depictsProduct, true);
      assert.equal(listCatalogProducts(database, "public").map((product) => product.slug).join(), "test-collar-record");
      assert.equal(getPublishedBySlug(database, "test-collar-record")?.madeToOrder, true);

      const view = presentPublishedProduct(published, (id) =>
        id === "img-5250"
          ? { id, publicFilename: "img-5250.webp", alt: "A supplied photograph.", shortLabel: "Shoulder harness", objectPosition: "center" }
          : { id, publicFilename: "img-5249.webp", alt: "A supplied photograph.", shortLabel: "Ring harness", objectPosition: "center" },
      );
      assert.ok(view);
      assert.equal(view.images[0]?.src, "/images/img-5249.webp");
      assert.equal(view.images[0]?.src?.includes("private-preview"), false);
      assert.match(view.images[0]?.caption ?? "", /not verified as the product/);
      assert.match(view.availabilityLabel, /Made to order/);
      const card = presentPublishedCard(published, (id) =>
        id === "img-5250"
          ? { id, publicFilename: "img-5250.webp", alt: "A supplied photograph.", shortLabel: "Shoulder harness", objectPosition: "center" }
          : undefined,
      );
      assert.equal(card?.image?.assetId, "img-5250");
      assert.equal(presentPublishedProduct({ ...published, status: "draft" }, () => undefined), null);
    });
  });

  it("rejects unknown photographs, duplicate slugs, and deleting a published product", () => {
    withDatabase((database) => {
      const published = saveCatalogProduct(database, sampleInput({ status: "published" }), assetIds);
      assert.throws(
        () => saveCatalogProduct(database, sampleInput({ slug: "second-record", images: [{ assetId: "not-a-real-photo", depictsProduct: true }] }), assetIds),
        CatalogStoreError,
      );
      assert.throws(() => saveCatalogProduct(database, sampleInput(), assetIds), CatalogStoreError);
      assert.throws(() => deleteCatalogProduct(database, published.id), CatalogStoreError);

      const archived = saveCatalogProduct(database, sampleInput({ id: published.id, status: "archived" }), assetIds);
      deleteCatalogProduct(database, archived.id);
      assert.equal(getPublishedBySlug(database, archived.slug), undefined);
      assert.equal(listCatalogProducts(database, "admin").length, 0);
    });
  });

  it("adds a category only when the editor supplies one", () => {
    withDatabase((database) => {
      const created = createCategory(database, { name: "Belts", slug: "belts", description: "" });
      assert.equal(created.slug, "belts");
      assert.throws(() => createCategory(database, { name: "Belts again", slug: "belts", description: "" }), CatalogStoreError);
    });
  });
});
