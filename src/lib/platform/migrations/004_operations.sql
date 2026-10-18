ALTER TABLE orders ADD COLUMN customer_id text;
ALTER TABLE orders ADD COLUMN carrier text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN tracking_number text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN shipped_at text;

CREATE INDEX orders_customer ON orders (customer_id);

CREATE TABLE order_tracking_tokens (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at text NOT NULL,
  revoked_at text
);

CREATE INDEX order_tracking_order ON order_tracking_tokens (order_id);

CREATE TABLE tracking_attempts (
  id text PRIMARY KEY,
  subject_hash text NOT NULL,
  attempted_at text NOT NULL
);

CREATE INDEX tracking_attempts_subject ON tracking_attempts (subject_hash, attempted_at);

CREATE TABLE order_events (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at text NOT NULL
);

CREATE INDEX order_events_order ON order_events (order_id, created_at);

CREATE TABLE notification_deliveries (
  id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  recipient text NOT NULL,
  related_id text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  provider_message_id text NOT NULL DEFAULT '',
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE TABLE customers (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified_at text,
  created_at text NOT NULL
);

CREATE TABLE customer_verification_tokens (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at text NOT NULL,
  used_at text
);

CREATE TABLE customer_login_attempts (
  id text PRIMARY KEY,
  email text NOT NULL,
  attempted_at text NOT NULL
);

CREATE INDEX customer_login_attempts_email ON customer_login_attempts (email, attempted_at);

CREATE TABLE store_policies (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  published integer NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  updated_at text NOT NULL
);

INSERT INTO store_policies (slug, title, body, published, updated_at) VALUES
  ('shipping', 'Shipping', '', 0, '1970-01-01T00:00:00.000Z'),
  ('returns', 'Returns and exchanges', '', 0, '1970-01-01T00:00:00.000Z'),
  ('privacy', 'Privacy', '', 0, '1970-01-01T00:00:00.000Z'),
  ('terms', 'Terms', '', 0, '1970-01-01T00:00:00.000Z'),
  ('custom-orders', 'Custom-order policies', '', 0, '1970-01-01T00:00:00.000Z')
ON CONFLICT (slug) DO NOTHING;
