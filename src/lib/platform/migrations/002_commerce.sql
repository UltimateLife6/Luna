CREATE TABLE carts (
  id text PRIMARY KEY,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE cart_items (
  seq bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  cart_id text NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  customization_json text NOT NULL DEFAULT '[]',
  UNIQUE (cart_id, variant_id, customization_json)
);

CREATE TABLE shipping_rates (
  id text PRIMARY KEY,
  label text NOT NULL,
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL,
  countries_json text NOT NULL,
  active integer NOT NULL CHECK (active IN (0, 1)),
  created_at text NOT NULL
);

CREATE TABLE orders (
  id text PRIMARY KEY,
  cart_id text NOT NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  payment_status text NOT NULL CHECK (payment_status IN ('pending', 'paid', 'canceled', 'refunded')),
  fulfillment_status text NOT NULL CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'fulfilled', 'canceled')),
  email text NOT NULL DEFAULT '',
  ship_name text NOT NULL DEFAULT '',
  ship_line1 text NOT NULL DEFAULT '',
  ship_line2 text NOT NULL DEFAULT '',
  ship_city text NOT NULL DEFAULT '',
  ship_region text NOT NULL DEFAULT '',
  ship_postal text NOT NULL DEFAULT '',
  ship_country text NOT NULL DEFAULT '',
  shipping_label text NOT NULL DEFAULT '',
  shipping_amount_minor integer,
  offered_shipping_json text NOT NULL,
  currency text NOT NULL,
  subtotal_minor integer NOT NULL CHECK (subtotal_minor >= 0),
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  expires_at text NOT NULL,
  paid_at text
);

CREATE TABLE order_lines (
  seq bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id text NOT NULL,
  variant_id text NOT NULL,
  product_name text NOT NULL,
  variant_label text NOT NULL,
  sku text NOT NULL,
  unit_price_minor integer NOT NULL CHECK (unit_price_minor >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  customization_json text NOT NULL,
  made_to_order integer NOT NULL CHECK (made_to_order IN (0, 1)),
  lead_time_note text NOT NULL DEFAULT '',
  reserved_quantity integer NOT NULL CHECK (reserved_quantity >= 0)
);

CREATE TABLE inventory_reservations (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
  expires_at text NOT NULL
);

CREATE TABLE webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at text NOT NULL
);

CREATE TABLE quote_requests (
  id text PRIMARY KEY,
  product_id text,
  product_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  details text NOT NULL,
  status text NOT NULL CHECK (status IN ('received', 'reviewing', 'closed')),
  admin_note text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX cart_items_cart ON cart_items (cart_id);
CREATE INDEX reservations_variant ON inventory_reservations (variant_id, status);
CREATE INDEX orders_cart ON orders (cart_id, payment_status);
CREATE INDEX orders_payment_intent ON orders (stripe_payment_intent_id);
CREATE INDEX quote_requests_created ON quote_requests (created_at);
