import { cookies } from "next/headers";
import { appEnv } from "@/lib/platform/env";

export const cartCookieName = "lf_cart";

export async function readCartId(): Promise<string | undefined> {
  const jar = await cookies();
  const value = jar.get(cartCookieName)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
}

export async function writeCartId(cartId: string): Promise<void> {
  const jar = await cookies();
  jar.set(cartCookieName, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv() !== "local",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
