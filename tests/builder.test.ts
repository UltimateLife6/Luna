import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { seededCategories } from "@/lib/catalog-store/categories";
import { openCatalogDatabase } from "@/lib/catalog-store/db";
import { productInputFromForm } from "@/lib/catalog-store/form";
import { listCategories, saveCatalogProduct } from "@/lib/catalog-store/products";
import type { ProductInput } from "@/lib/catalog-store/types";
import { CommerceError } from "@/lib/commerce/errors";
import { assertQuoteAdmin, createQuoteRequest, getQuoteRequest, updateQuoteRequest } from "@/lib/commerce/quotes";
import { resolveConfiguration } from "@/lib/commerce/selection";
import { addCartItem, createCart, getOrder, placePendingOrder, readCart, saveShippingRate } from "@/lib/commerce/store";

const now = new Date("2026-10-18T15:00:00.000Z");
let sequence = 0;

function withDatabase(run: (database: DatabaseSync) => void): void {
  const database = openCatalogDatabase(":memory:");

  try {
    run(database);
  } finally {
    database.close();
  }
}

function sell(database: DatabaseSync, overrides: Partial<ProductInput> = {}): { productId: string; variantId: string } {
  sequence += 1;
  const input: ProductInput = {
    name: `Builder piece ${sequence}`,
    slug: `builder-piece-${sequence}`,
    summary: "A local catalog record created for a builder test.",
    description: "This description exists only inside the test database.",
    categoryId: listCategories(database)[0].id,
    status: "published",
    madeToOrder: false,
    madeToOrderNote: "",
    purchaseMode: "checkout",
    customizationGroups: [],
    images: [],
    variants: [
      {
        label: "One size",
        sku: `BUILD-${sequence}`,
        currency: "USD",
        priceMinor: 12500,
        inventoryCount: 4,
      },
    ],
    ...overrides,
  };
  const product = saveCatalogProduct(database, input, []);

  return { productId: product.id, variantId: product.variants[0].id };
}

describe("custom product builder", () => {
  it("prices saved options on the server and ignores a browser price", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "group-finish",
            label: "Test finish",
            kind: "single",
            required: true,
            options: [
              { id: "finish-a", label: "Finish A", priceAdjustmentMinor: 700, available: true },
              { id: "finish-b", label: "Finish B", priceAdjustmentMinor: 0, available: true },
            ],
          },
        ],
      });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 2, { optionIds: ["finish-a"], texts: [], measurements: [] }, now, 1);
      const cart = readCart(database, cartId, now);

      assert.equal(cart.lines[0].unitPriceMinor, 12500);
      assert.equal(cart.lines[0].adjustmentMinor, 700);
      assert.equal(cart.subtotalMinor, 26400);
    });
  });

  it("requires a saved choice and rejects an unknown or unavailable option", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "group-size",
            label: "Test size",
            kind: "single",
            required: true,
            options: [
              { id: "size-a", label: "Size A", priceAdjustmentMinor: 0, available: true },
              { id: "size-b", label: "Size B", priceAdjustmentMinor: 0, available: false },
            ],
          },
        ],
      });
      const cartId = createCart(database, now);

      assert.throws(() => addCartItem(database, cartId, variantId, 1, [], now), /Test size is required/);
      assert.throws(
        () => addCartItem(database, cartId, variantId, 1, ["missing"], now),
        (error: unknown) => error instanceof CommerceError && error.errors.some((message) => message.includes("not saved on this product")),
      );
      assert.throws(() => addCartItem(database, cartId, variantId, 1, ["size-b"], now), /not available/);
    });
  });

  it("keeps two configurations of one variant on separate lines", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "group-line",
            label: "Test line",
            options: [
              { id: "line-a", label: "Line A", priceAdjustmentMinor: 300 },
              { id: "line-b", label: "Line B", priceAdjustmentMinor: 900 },
            ],
          },
        ],
      });
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, ["line-a"], now);
      addCartItem(database, cartId, variantId, 1, ["line-b"], now);
      const cart = readCart(database, cartId, now);

      assert.equal(cart.lines.length, 2);
      assert.equal(cart.subtotalMinor, 12500 + 300 + 12500 + 900);
    });
  });

  it("blocks a saved line when the option price changes and keeps the order snapshot", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "group-lock",
            label: "Test lock",
            options: [{ id: "lock-a", label: "Lock A", priceAdjustmentMinor: 400 }],
          },
        ],
      });
      saveShippingRate(database, { label: "Test shipping", amountMinor: 800, countries: ["US"] }, now);
      const cartId = createCart(database, now);
      addCartItem(database, cartId, variantId, 1, ["lock-a"], now);
      const savedLine = database.prepare("SELECT customization_json FROM cart_items WHERE cart_id = ?").get(cartId) as { customization_json: string };
      const pending = placePendingOrder(database, cartId, now);
      const order = getOrder(database, pending.orderId);
      const stored = database.prepare("SELECT customization_json FROM products WHERE id = (SELECT product_id FROM variants WHERE id = ?)").get(variantId) as {
        customization_json: string;
      };
      const groups = JSON.parse(stored.customization_json) as { options: { priceAdjustmentMinor: number }[] }[];
      groups[0].options[0].priceAdjustmentMinor = 1800;
      database.prepare("UPDATE products SET customization_json = ? WHERE id = (SELECT product_id FROM variants WHERE id = ?)").run(JSON.stringify(groups), variantId);

      const nextCart = createCart(database, now);
      database
        .prepare("INSERT INTO cart_items (id, cart_id, variant_id, quantity, customization_json) VALUES ('stale-line', ?, ?, 1, ?)")
        .run(nextCart, variantId, savedLine.customization_json);
      const stale = readCart(database, nextCart, now);

      assert.equal(order?.lines[0].selections[0].priceAdjustmentMinor, 400);
      assert.equal(order?.lines[0].selections[0].optionLabel, "Lock A");
      assert.equal(stale.lines[0].purchasable, false);
      assert.equal(stale.subtotalMinor, 0);
      assert.throws(() => placePendingOrder(database, nextCart, now), /no longer matches/);
    });
  });

  it("validates a measurement and stores it on the order", () => {
    withDatabase((database) => {
      const { variantId } = sell(database, {
        customizationGroups: [
          {
            id: "measure-neck",
            label: "Test measurement",
            kind: "measurement",
            required: true,
            unit: "in",
            min: 10,
            max: 20,
            options: [],
          },
        ],
      });
      saveShippingRate(database, { label: "Test shipping", amountMinor: 500, countries: ["US"] }, now);
      const cartId = createCart(database, now);

      assert.throws(() => addCartItem(database, cartId, variantId, 1, { optionIds: [], texts: [], measurements: [{ groupId: "measure-neck", value: "9" }] }, now), /at least 10/);
      assert.throws(
        () => addCartItem(database, cartId, variantId, 1, { optionIds: [], texts: [], measurements: [{ groupId: "measure-neck", value: "12 inches" }] }, now),
        /two decimal places/,
      );
      addCartItem(database, cartId, variantId, 1, { optionIds: [], texts: [], measurements: [{ groupId: "measure-neck", value: "12.50" }] }, now, 99);
      const pending = placePendingOrder(database, cartId, now);
      const order = getOrder(database, pending.orderId);

      assert.equal(readCart(database, cartId, now).lines.length, 0);
      assert.equal(order?.lines[0].selections[0].optionLabel, "12.50 in");
      assert.equal(order?.lines[0].selections[0].detail, "12.50");
      assert.equal(order?.lines[0].selections[0].priceAdjustmentMinor, 0);
      assert.equal(order?.subtotalMinor, 12500);
    });
  });

  it("does not invent a measurement unit", () => {
    assert.throws(
      () =>
        resolveConfiguration(
          [
            {
              id: "measure-open",
              label: "Open measurement",
              kind: "measurement",
              required: true,
              options: [],
            },
          ],
          { optionIds: [], texts: [], measurements: [{ groupId: "measure-open", value: "12" }] },
        ),
      /saved unit/,
    );
  });

  it("keeps quote-only records outside checkout and stores a free request", () => {
    withDatabase((database) => {
      const quote = sell(database, { purchaseMode: "quote-only", slug: "quote-piece", name: "Quote piece" });
      const checkout = sell(database, { purchaseMode: "checkout" });
      const cartId = createCart(database, now);

      assert.throws(() => addCartItem(database, cartId, quote.variantId, 1, [], now), CommerceError);
      assert.throws(
        () => createQuoteRequest(database, { productId: checkout.productId, contactName: "Test Guest", email: "guest@example.test", details: "A request that is long enough." }, now),
        /quote-only/,
      );
      assert.throws(
        () => createQuoteRequest(database, { productId: quote.productId, contactName: "Test Guest", email: "guest@example.test", details: "short" }, now),
        /10 to 2000/,
      );

      const saved = createQuoteRequest(
        database,
        { productId: quote.productId, contactName: "Test Guest", email: "guest@example.test", details: "Please review this local test request." },
        now,
      );
      const columns = database.prepare("PRAGMA table_info(quote_requests)").all() as { name: string }[];

      assert.equal(saved.status, "received");
      assert.equal(columns.some((column) => /price|amount|total|lead/.test(column.name)), false);
      assert.throws(() => assertQuoteAdmin("anonymous"), /Sign in/);
      assert.throws(() => assertQuoteAdmin("closed"), /closed/);
      assert.doesNotThrow(() => assertQuoteAdmin("ready"));
      updateQuoteRequest(database, saved.id, { status: "reviewing", adminNote: "Waiting for the maker." }, now);

      assert.equal(getQuoteRequest(database, saved.id)?.status, "reviewing");
      assert.equal(getQuoteRequest(database, saved.id)?.adminNote, "Waiting for the maker.");
    });
  });

  it("reads a measurement group from the admin form and rejects a missing unit", () => {
    const categoryId = seededCategories[0].id;
    const form = new FormData();
    form.set("name", "Measurement form record");
    form.set("slug", "measurement-form-record");
    form.set("summary", "A local catalog record created for a builder test.");
    form.set("description", "This description exists only inside the test database.");
    form.set("categoryId", categoryId);
    form.set("status", "draft");
    form.set("purchaseMode", "quote-only");
    form.set("variant_0_label", "One size");
    form.set("variant_0_price", "12500");
    form.set("variant_0_inventory", "1");
    form.set("group_0_label", "Test measurement");
    form.set("group_0_kind", "measurement");
    form.set("group_0_required", "on");
    form.set("group_0_unit", "cm");
    form.set("group_0_min", "10");
    form.set("group_0_max", "40");

    const parsed = productInputFromForm(form, { categoryIds: [categoryId], assetIds: [] });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const group = parsed.value.customizationGroups?.[0];
      assert.ok(group);
      assert.equal(group.unit, "cm");
      assert.equal(group.required, true);
      assert.equal(group.options.length, 0);
    }

    form.set("group_0_unit", "");
    const rejected = productInputFromForm(form, { categoryIds: [categoryId], assetIds: [] });
    assert.equal(rejected.ok, false);
    if (!rejected.ok) {
      assert.match(rejected.errors.join(" "), /unit of in, cm, or mm/);
    }
  });
});
