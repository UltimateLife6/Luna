CREATE TABLE categories (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL
);

CREATE TABLE products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL,
  category_id text NOT NULL REFERENCES categories (id),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  made_to_order integer NOT NULL CHECK (made_to_order IN (0, 1)),
  made_to_order_note text NOT NULL DEFAULT '',
  purchase_mode text NOT NULL DEFAULT 'quote-only' CHECK (purchase_mode IN ('quote-only', 'checkout')),
  customization_json text NOT NULL DEFAULT '[]',
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  label text NOT NULL,
  sku text NOT NULL UNIQUE,
  sku_assigned integer NOT NULL CHECK (sku_assigned IN (0, 1)),
  currency text NOT NULL,
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  inventory_count integer NOT NULL CHECK (inventory_count >= 0),
  position integer NOT NULL
);

CREATE TABLE product_images (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  asset_id text NOT NULL,
  depicts_product integer NOT NULL CHECK (depicts_product IN (0, 1)),
  position integer NOT NULL,
  UNIQUE (product_id, asset_id)
);

CREATE INDEX products_status ON products (status);
CREATE INDEX variants_product ON variants (product_id);
CREATE INDEX product_images_product ON product_images (product_id);

INSERT INTO categories (id, slug, name, description, sort_order) VALUES
  ('cat-accessories', 'accessories', 'Leather Accessories', 'Browsing category. Products appear here only after they are published in the local catalog.', 1),
  ('cat-masks', 'masks', 'Masks & Headpieces', 'Browsing category. Products appear here only after they are published in the local catalog.', 2),
  ('cat-harnesses', 'harnesses', 'Harnesses', 'Browsing category. Products appear here only after they are published in the local catalog.', 3),
  ('cat-fantasy', 'fantasy', 'Fantasy-Inspired Leatherwork', 'Browsing category. Products appear here only after they are published in the local catalog.', 4);
