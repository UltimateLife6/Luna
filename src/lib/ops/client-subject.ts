import { headers } from "next/headers";
import { trackingSubject } from "@/lib/ops/tracking";

type HeaderSource = { get(name: string): string | null };

export function clientAddress(source: HeaderSource): string {
  const vercel = firstHop(source.get("x-vercel-forwarded-for"));

  if (vercel) {
    return vercel;
  }

  const real = source.get("x-real-ip")?.trim() ?? "";

  if (real) {
    return real;
  }

  return "local";
}

export async function currentClientAddress(): Promise<string> {
  return clientAddress(await headers());
}

export async function currentTrackingSubject(): Promise<string> {
  return trackingSubject(await currentClientAddress());
}

function firstHop(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}
