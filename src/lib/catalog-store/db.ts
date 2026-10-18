import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seededCategories } from "@/lib/catalog-store/categories";
import { allowsSqlite } from "@/lib/platform/env";

const globalDatabase = globalThis as { __lunafaeCatalog?: DatabaseSync };

export function catalogDatabasePath(): string {
  return process.env.CATALOG_DB_PATH || path.join(process.cwd(), "data", "catalog.sqlite");
}

export function openCatalogDatabase(filename: string): DatabaseSync {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(filename), { recursive: true });
  }

  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");

  if (filename !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL");
  }

  migrate(database);
  ensureQuoteRequests(database);
  ensurePlatformTables(database);
  return database;
}

function ensureQuoteRequests(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS quote_requests (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('received', 'reviewing', 'closed')),
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function getCatalogDatabase(): DatabaseSync {
  if (!allowsSqlite()) {
    throw new Error("SQLite is not used in this environment. Connect PostgreSQL with DATABASE_URL.");
  }

  if (!globalDatabase.__lunafaeCatalog) {
    globalDatabase.__lunafaeCatalog = openCatalogDatabase(catalogDatabasePath());
  }

  return globalDatabase.__lunafaeCatalog;
}

function ensurePlatformTables(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS login_attempts_email ON login_attempts (email, attempted_at);

    CREATE TABLE IF NOT EXISTS media_objects (
      id TEXT PRIMARY KEY,
      storage_key TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size > 0),
      approval TEXT NOT NULL CHECK (approval IN ('withheld', 'approved-for-demo')),
      created_at TEXT NOT NULL
    );
  `);
  ensureOperationsTables(database);
}

export function ensureOperationsTables(database: DatabaseSync): void {
  if (!hasColumn(database, "orders", "customer_id")) {
    database.exec("ALTER TABLE orders ADD COLUMN customer_id TEXT");
  }

  if (!hasColumn(database, "orders", "carrier")) {
    database.exec("ALTER TABLE orders ADD COLUMN carrier TEXT NOT NULL DEFAULT ''");
  }

  if (!hasColumn(database, "orders", "tracking_number")) {
    database.exec("ALTER TABLE orders ADD COLUMN tracking_number TEXT NOT NULL DEFAULT ''");
  }

  if (!hasColumn(database, "orders", "shipped_at")) {
    database.exec("ALTER TABLE orders ADD COLUMN shipped_at TEXT");
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS orders_customer ON orders (customer_id);

    CREATE TABLE IF NOT EXISTS order_tracking_tokens (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE INDEX IF NOT EXISTS order_tracking_order ON order_tracking_tokens (order_id);

    CREATE TABLE IF NOT EXISTS tracking_attempts (
      id TEXT PRIMARY KEY,
      subject_hash TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tracking_attempts_subject ON tracking_attempts (subject_hash, attempted_at);

    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS order_events_order ON order_events (order_id, created_at);

    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      recipient TEXT NOT NULL,
      related_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      provider_message_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_verification_tokens (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customer_login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS customer_login_attempts_email ON customer_login_attempts (email, attempted_at);

    CREATE TABLE IF NOT EXISTS store_policies (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
      updated_at TEXT NOT NULL
    );
  `);

  const insertPolicy = database.prepare(
    "INSERT OR IGNORE INTO store_policies (slug, title, body, published, updated_at) VALUES (?, ?, '', 0, '1970-01-01T00:00:00.000Z')",
  );

  for (const policy of [
    ["shipping", "Shipping"],
    ["returns", "Returns and exchanges"],
    ["privacy", "Privacy"],
    ["terms", "Terms"],
    ["custom-orders", "Custom-order policies"],
  ] as const) {
    insertPolicy.run(policy[0], policy[1]);
  }
}

function hasColumn(database: DatabaseSync, table: "orders", column: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function migrate(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY
    );
  `);

  if (!migrationApplied(database, 1)) {
    applyVersion1(database);
  }

  if (!migrationApplied(database, 2)) {
    applyVersion2(database);
  }
}

function migrationApplied(database: DatabaseSync, version: number): boolean {
  return Boolean(database.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version));
}

function applyVersion1(database: DatabaseSync): void {
  database.exec("BEGIN");

  try {
    database.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        summary TEXT NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id),
        status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
        made_to_order INTEGER NOT NULL CHECK (made_to_order IN (0, 1)),
        made_to_order_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        sku_assigned INTEGER NOT NULL CHECK (sku_assigned IN (0, 1)),
        currency TEXT NOT NULL,
        price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
        inventory_count INTEGER NOT NULL CHECK (inventory_count >= 0),
        position INTEGER NOT NULL
      );

      CREATE TABLE product_images (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        asset_id TEXT NOT NULL,
        depicts_product INTEGER NOT NULL CHECK (depicts_product IN (0, 1)),
        position INTEGER NOT NULL,
        UNIQUE (product_id, asset_id)
      );

      CREATE INDEX products_status ON products (status);
      CREATE INDEX variants_product ON variants (product_id);
      CREATE INDEX product_images_product ON product_images (product_id);
    `);

    const insertCategory = database.prepare(
      "INSERT INTO categories (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)",
    );

    for (const category of seededCategories) {
      insertCategory.run(category.id, category.slug, category.name, category.description, category.sortOrder);
    }

    database.prepare("INSERT INTO schema_migrations (version) VALUES (1)").run();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function applyVersion2(database: DatabaseSync): void {
  database.exec("BEGIN");

  try {
    database.exec(`
      ALTER TABLE products ADD COLUMN purchase_mode TEXT NOT NULL DEFAULT 'quote-only';
      ALTER TABLE products ADD COLUMN customization_json TEXT NOT NULL DEFAULT '[]';

      CREATE TABLE carts (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        customization_json TEXT NOT NULL DEFAULT '[]',
        UNIQUE (cart_id, variant_id, customization_json)
      );

      CREATE TABLE shipping_rates (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
        currency TEXT NOT NULL,
        countries_json TEXT NOT NULL,
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        created_at TEXT NOT NULL
      );

      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL,
        stripe_session_id TEXT UNIQUE,
        stripe_payment_intent_id TEXT,
        payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'canceled', 'refunded')),
        fulfillment_status TEXT NOT NULL CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'fulfilled', 'canceled')),
        email TEXT NOT NULL DEFAULT '',
        ship_name TEXT NOT NULL DEFAULT '',
        ship_line1 TEXT NOT NULL DEFAULT '',
        ship_line2 TEXT NOT NULL DEFAULT '',
        ship_city TEXT NOT NULL DEFAULT '',
        ship_region TEXT NOT NULL DEFAULT '',
        ship_postal TEXT NOT NULL DEFAULT '',
        ship_country TEXT NOT NULL DEFAULT '',
        shipping_label TEXT NOT NULL DEFAULT '',
        shipping_amount_minor INTEGER,
        offered_shipping_json TEXT NOT NULL,
        currency TEXT NOT NULL,
        subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
        total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        paid_at TEXT
      );

      CREATE TABLE order_lines (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        variant_label TEXT NOT NULL,
        sku TEXT NOT NULL,
        unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        customization_json TEXT NOT NULL,
        made_to_order INTEGER NOT NULL CHECK (made_to_order IN (0, 1)),
        lead_time_note TEXT NOT NULL DEFAULT '',
        reserved_quantity INTEGER NOT NULL CHECK (reserved_quantity >= 0)
      );

      CREATE TABLE inventory_reservations (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        variant_id TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status TEXT NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
        expires_at TEXT NOT NULL
      );

      CREATE TABLE webhook_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        processed_at TEXT NOT NULL
      );

      CREATE INDEX cart_items_cart ON cart_items (cart_id);
      CREATE INDEX reservations_variant ON inventory_reservations (variant_id, status);
      CREATE INDEX orders_cart ON orders (cart_id, payment_status);
      CREATE INDEX orders_session ON orders (stripe_session_id);
    `);

    database.prepare("INSERT INTO schema_migrations (version) VALUES (2)").run();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
