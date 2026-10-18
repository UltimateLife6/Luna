CREATE TABLE admin_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at text NOT NULL
);

CREATE TABLE login_attempts (
  id text PRIMARY KEY,
  email text NOT NULL,
  attempted_at text NOT NULL
);

CREATE INDEX login_attempts_email ON login_attempts (email, attempted_at);

CREATE TABLE media_objects (
  id text PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0),
  approval text NOT NULL CHECK (approval IN ('withheld', 'approved-for-demo')),
  created_at text NOT NULL
);
