import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignInError, hashPassword, loginFailureLimit, loginWindowMs, minimumPasswordLength, normalizeEmail, validAdminEmail, verifyPassword } from "@/lib/platform/accounts";
import { integer, one, type Sql } from "@/lib/platform/sql";
import { dispatchNotification, type EmailSender } from "@/lib/ops/notifications";
import { emailVerification } from "@/lib/ops/templates";
import { requestOrigin } from "@/lib/ops/orders";

const verificationMs = 24 * 60 * 60 * 1000;

export type CustomerAccount = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
};

export async function registerCustomer(
  sql: Sql,
  input: { email: string; password: string },
  now: Date,
  sender: EmailSender | null,
  origin: string,
): Promise<{ account: CustomerAccount; verificationToken: string | null }> {
  const email = normalizeEmail(input.email);

  if (!validAdminEmail(email)) {
    throw new Error("Enter an email address.");
  }

  if (input.password.length < minimumPasswordLength) {
    throw new Error(`Use at least ${minimumPasswordLength} characters.`);
  }

  const existing = await one<{ id: string }>(sql, "SELECT id FROM customers WHERE email = ?", [email]);

  if (existing) {
    return { account: { id: existing.id, email, emailVerifiedAt: null }, verificationToken: null };
  }

  const account: CustomerAccount = { id: randomUUID(), email, emailVerifiedAt: null };
  await sql.execute("INSERT INTO customers (id, email, password_hash, email_verified_at, created_at) VALUES (?, ?, ?, NULL, ?)", [
    account.id,
    account.email,
    hashPassword(input.password),
    now.toISOString(),
  ]);
  const verificationToken = await issueVerificationToken(sql, account.id, now);
  const verifyUrl = requestOrigin(origin) && verificationToken ? `${requestOrigin(origin)}/account/verify?token=${verificationToken}` : "";

  if (verifyUrl) {
    const content = emailVerification({ verifyUrl });
    await dispatchNotification(
      sql,
      {
        idempotencyKey: `verify-email:${account.id}:${hashToken(verificationToken)}`,
        kind: "verify-email",
        recipient: account.email,
        relatedId: account.id,
        message: content,
      },
      sender,
      now,
    );
  }

  return { account, verificationToken };
}

export async function verifyCustomerEmail(sql: Sql, token: string, now: Date): Promise<CustomerAccount | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const row = await one<{ id: string; customer_id: string; expires_at: string; used_at: string | null }>(
    sql,
    "SELECT id, customer_id, expires_at, used_at FROM customer_verification_tokens WHERE token_hash = ?",
    [hashToken(token)],
  );

  if (!row || row.used_at || row.expires_at <= now.toISOString()) {
    return null;
  }

  await sql.execute("UPDATE customer_verification_tokens SET used_at = ? WHERE id = ?", [now.toISOString(), row.id]);
  await sql.execute("UPDATE customers SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL", [now.toISOString(), row.customer_id]);
  await claimGuestOrders(sql, row.customer_id);
  return getCustomer(sql, row.customer_id);
}

export async function authenticateCustomer(sql: Sql, emailInput: string, password: string, now: Date): Promise<CustomerAccount> {
  const email = normalizeEmail(emailInput);

  if (!validAdminEmail(email) || password.length < 1) {
    throw new SignInError("That email or password does not match a customer account.", "invalid");
  }

  if (await customerLoginBlocked(sql, email, now)) {
    throw new SignInError("Too many sign-in attempts. Wait and try again.", "rate_limited");
  }

  const row = await one<{ id: string; email: string; password_hash: string; email_verified_at: string | null }>(
    sql,
    "SELECT id, email, password_hash, email_verified_at FROM customers WHERE email = ?",
    [email],
  );
  const matches = row ? verifyPassword(password, row.password_hash) : false;

  if (!row || !matches || !row.email_verified_at) {
    await sql.execute("INSERT INTO customer_login_attempts (id, email, attempted_at) VALUES (?, ?, ?)", [randomUUID(), email, now.toISOString()]);
    throw new SignInError("That email or password does not match a customer account.", "invalid");
  }

  await sql.execute("DELETE FROM customer_login_attempts WHERE email = ?", [email]);
  await claimGuestOrders(sql, row.id);
  return { id: row.id, email: row.email, emailVerifiedAt: row.email_verified_at };
}

export async function claimGuestOrders(sql: Sql, customerId: string): Promise<number> {
  const customer = await getCustomer(sql, customerId);

  if (!customer?.emailVerifiedAt) {
    return 0;
  }

  const result = await sql.execute(
    "UPDATE orders SET customer_id = ? WHERE lower(email) = ? AND (customer_id IS NULL OR customer_id = '')",
    [customer.id, customer.email],
  );
  return result.changes;
}

export async function getCustomer(sql: Sql, id: string): Promise<CustomerAccount | null> {
  const row = await one<{ id: string; email: string; email_verified_at: string | null }>(
    sql,
    "SELECT id, email, email_verified_at FROM customers WHERE id = ?",
    [id],
  );

  if (!row) {
    return null;
  }

  return { id: row.id, email: row.email, emailVerifiedAt: row.email_verified_at };
}

async function issueVerificationToken(sql: Sql, customerId: string, now: Date): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql.execute("INSERT INTO customer_verification_tokens (id, customer_id, token_hash, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)", [
    randomUUID(),
    customerId,
    hashToken(token),
    new Date(now.getTime() + verificationMs).toISOString(),
  ]);
  return token;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function customerLoginBlocked(sql: Sql, email: string, now: Date): Promise<boolean> {
  const row = await one<{ attempts: unknown }>(
    sql,
    "SELECT COUNT(*) AS attempts FROM customer_login_attempts WHERE email = ? AND attempted_at > ?",
    [email, new Date(now.getTime() - loginWindowMs).toISOString()],
  );

  return integer(row?.attempts) >= loginFailureLimit;
}
