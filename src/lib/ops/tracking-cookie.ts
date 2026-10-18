import { cookies } from "next/headers";
import { appEnv } from "@/lib/platform/env";

export const trackingCookieName = "lf_track";

export async function readTrackingHint(): Promise<string | undefined> {
  const value = (await cookies()).get(trackingCookieName)?.value;
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

export async function writeTrackingHint(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(trackingCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv() !== "local",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
