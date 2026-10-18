import { cookies } from "next/headers";
import { appEnv, authConfiguration } from "@/lib/platform/env";
import { customerCookieName, openCustomerSession, sealCustomerSession } from "@/lib/customer/session";

export async function readCustomerId(now = new Date()): Promise<string | null> {
  const configuration = authConfiguration();

  if ("error" in configuration) {
    return null;
  }

  const token = (await cookies()).get(customerCookieName)?.value;

  if (!token) {
    return null;
  }

  return openCustomerSession(token, now, configuration.secret);
}

export async function writeCustomerSession(customerId: string, now = new Date()): Promise<void> {
  const configuration = authConfiguration();

  if ("error" in configuration) {
    throw new Error(configuration.error);
  }

  const jar = await cookies();
  jar.set(customerCookieName, sealCustomerSession(customerId, now, configuration.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: appEnv() !== "local",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(customerCookieName);
}
