import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { integer, one, type Sql } from "@/lib/platform/sql";

export const loginWindowMs = 15 * 60 * 1000;
export const loginFailureLimit = 5;
export const minimumPasswordLength = 12;

export type AdminRole = "owner" | "admin";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};

export class SignInError extends Error {
  constructor(
    message: string,
    readonly code: "rate_limited" | "invalid",
  ) {
    super(message);
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32);
  return `scrypt:16384:8:1:${salt}:${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, cost, blockSize, parallel, salt, encoded] = stored.split(":");

  if (algorithm !== "scrypt" || !cost || !blockSize || !parallel || !salt || !encoded) {
    return false;
  }

  const derived = scryptSync(password, salt, 32, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallel),
  });
  const expected = Buffer.from(encoded, "base64url");

  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validAdminEmail(value: string): boolean {
  return value.length > 3 && value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function loginBlocked(sql: Sql, email: string, now: Date): Promise<boolean> {
  const row = await one<{ attempts: unknown }>(
    sql,
    "SELECT COUNT(*) AS attempts FROM login_attempts WHERE email = ? AND attempted_at > ?",
    [email, new Date(now.getTime() - loginWindowMs).toISOString()],
  );

  return integer(row?.attempts) >= loginFailureLimit;
}

export async function authenticateAdmin(sql: Sql, emailInput: string, password: string, now: Date): Promise<AdminUser> {
  const email = normalizeEmail(emailInput);

  if (!validAdminEmail(email) || password.length < 1) {
    throw new SignInError("That email or password does not match an owner account.", "invalid");
  }

  if (await loginBlocked(sql, email, now)) {
    throw new SignInError("Too many sign-in attempts. Wait and try again.", "rate_limited");
  }

  const row = await one<{ id: string; email: string; password_hash: string; role: string }>(
    sql,
    "SELECT id, email, password_hash, role FROM admin_users WHERE email = ?",
    [email],
  );
  const matches = row ? verifyPassword(password, row.password_hash) : false;

  if (!row || !matches || (row.role !== "owner" && row.role !== "admin")) {
    await sql.execute("INSERT INTO login_attempts (id, email, attempted_at) VALUES (?, ?, ?)", [randomUUID(), email, now.toISOString()]);
    throw new SignInError("That email or password does not match an owner account.", "invalid");
  }

  await sql.execute("DELETE FROM login_attempts WHERE email = ?", [email]);
  return { id: row.id, email: row.email, role: row.role };
}

export async function createAdminUser(sql: Sql, input: { email: string; password: string; role?: AdminRole }, now: Date): Promise<AdminUser> {
  const email = normalizeEmail(input.email);
  const role = input.role ?? "owner";

  if (!validAdminEmail(email)) {
    throw new Error("ADMIN_EMAIL must be an email address.");
  }

  if (input.password.length < minimumPasswordLength) {
    throw new Error(`ADMIN_PASSWORD must be at least ${minimumPasswordLength} characters.`);
  }

  if (role !== "owner" && role !== "admin") {
    throw new Error("ADMIN_ROLE must be owner or admin.");
  }

  const existing = await one(sql, "SELECT id FROM admin_users WHERE email = ?", [email]);

  if (existing) {
    throw new Error("An account with that email is already saved.");
  }

  const user: AdminUser = { id: randomUUID(), email, role };
  await sql.execute("INSERT INTO admin_users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)", [
    user.id,
    user.email,
    hashPassword(input.password),
    user.role,
    now.toISOString(),
  ]);
  return user;
}
