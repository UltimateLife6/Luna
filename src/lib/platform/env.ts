export type AppEnv = "local" | "staging" | "production";

const appEnvs: readonly AppEnv[] = ["local", "staging", "production"];

type EnvSource = Record<string, string | undefined>;

export function appEnv(source: EnvSource = process.env): AppEnv {
  const value = source.APP_ENV?.trim() ?? "";

  if (!value) {
    return source.VERCEL === "1" ? "production" : "local";
  }

  if (appEnvs.includes(value as AppEnv)) {
    return value as AppEnv;
  }

  throw new Error("APP_ENV must be local, staging, or production.");
}

export function allowsSqlite(source: EnvSource = process.env): boolean {
  if (source.DATABASE_URL?.trim()) {
    return false;
  }

  return appEnv(source) === "local";
}

export function assertDatabaseUrl(value: string | undefined): string {
  const url = value?.trim() ?? "";

  if (!url) {
    throw new Error("DATABASE_URL is required for this environment.");
  }

  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  }

  return url;
}

export function assertStripeTestConfiguration(secretKey: string | undefined): void {
  const key = secretKey?.trim() ?? "";

  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) {
    throw new Error("Live Stripe keys are refused. Payments stay in test mode.");
  }
}

export type AuthConfiguration = { secret: string } | { error: string };

export function authConfiguration(source: EnvSource = process.env): AuthConfiguration {
  const secret = source.AUTH_SECRET?.trim() ?? "";

  if (!secret) {
    return { error: "AUTH_SECRET is not set." };
  }

  if (secret.length < 32) {
    return { error: "AUTH_SECRET must be at least 32 characters." };
  }

  return { secret };
}

export type EmailConfiguration =
  | { enabled: false; reason: string }
  | { enabled: true; provider: "resend" | "sendgrid"; apiKey: string; from: string };

const blockedSenderDomains = new Set(["example.com", "example.net", "example.org", "localhost", "invalid"]);

export function emailConfiguration(source: EnvSource = process.env): EmailConfiguration {
  const provider = source.EMAIL_PROVIDER?.trim().toLowerCase() ?? "";
  const apiKey = source.EMAIL_API_KEY?.trim() ?? "";
  const from = verifiedSender(source.EMAIL_FROM);

  if ((provider !== "resend" && provider !== "sendgrid") || !apiKey || !from || source.EMAIL_SENDER_VERIFIED !== "true") {
    return { enabled: false, reason: "Email delivery is not configured." };
  }

  return { enabled: true, provider, apiKey, from };
}

export function verifiedSender(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  const match = trimmed.match(/^(?:.*<)?([A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,}))>?$/);

  if (!match) {
    return null;
  }

  const domain = match[2]?.toLowerCase() ?? "";

  if (!domain || blockedSenderDomains.has(domain) || domain.endsWith(".example") || domain.endsWith(".local")) {
    return null;
  }

  return match[1] ?? null;
}

export function mediaBackend(source: EnvSource = process.env): "blob" | "local" | "unconfigured" {
  if (source.BLOB_READ_WRITE_TOKEN?.trim()) {
    return "blob";
  }

  if (appEnv(source) === "local") {
    return "local";
  }

  return "unconfigured";
}
