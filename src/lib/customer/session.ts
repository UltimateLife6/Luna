import { createHmac, timingSafeEqual } from "node:crypto";

export const customerCookieName = "lf_customer";
export const customerSessionMs = 8 * 60 * 60 * 1000;

export function sealCustomerSession(customerId: string, now: Date, secret: string): string {
  const body = Buffer.from(JSON.stringify({ aud: "customer", sub: customerId, exp: now.getTime() + customerSessionMs })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function openCustomerSession(token: string, now: Date, secret: string): string | null {
  const [body, mac] = token.split(".");

  if (!body || !mac) {
    return null;
  }

  const expected = sign(body, secret);
  const left = Buffer.from(expected);
  const right = Buffer.from(mac);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { aud?: unknown; sub?: unknown; exp?: unknown };

    if (parsed.aud !== "customer" || typeof parsed.sub !== "string" || typeof parsed.exp !== "number" || parsed.exp <= now.getTime()) {
      return null;
    }

    return parsed.sub;
  } catch {
    return null;
  }
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
