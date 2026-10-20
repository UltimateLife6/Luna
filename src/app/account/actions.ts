"use server";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { authenticateCustomer, registerCustomer } from "@/lib/customer/accounts";
import { clearCustomerSession, writeCustomerSession } from "@/lib/customer/cookie";
import { currentClientAddress } from "@/lib/ops/client-subject";
import { senderFromEnv } from "@/lib/ops/notifications";
import { requestOrigin } from "@/lib/ops/orders";
import { accountAttemptLimit, attemptAllowed, recordAttempt, signInAttemptLimit, trackingSubject } from "@/lib/ops/tracking";
import { applicationSql } from "@/lib/platform/runtime";
import { SignInError } from "@/lib/platform/accounts";
import { authConfiguration, emailConfiguration } from "@/lib/platform/env";

export type AccountFormState = { errors: string[]; notice: string };

const initialNotice = "If the address can be used, the next step is email verification. Guest checkout stays available.";

export async function registerCustomerAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  await connection();
  const configuration = authConfiguration();

  if ("error" in configuration) {
    return { errors: ["Customer accounts are not open yet."], notice: "" };
  }

  const now = new Date();
  const subject = trackingSubject(`account:${await currentClientAddress()}`);
  const sql = await applicationSql();

  if (!(await attemptAllowed(sql, subject, now, accountAttemptLimit))) {
    return { errors: ["Too many account attempts. Wait and try again."], notice: "" };
  }

  await recordAttempt(sql, subject, now);

  try {
    await registerCustomer(
      await applicationSql(),
      { email: text(formData, "email"), password: text(formData, "password") },
      now,
      senderFromEnv(),
      requestOrigin(process.env.AUTH_URL),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe = message === "Enter an email address." || message.startsWith("Use at least ") ? message : "The account was not created.";
    return { errors: [safe], notice: "" };
  }

  const email = emailConfiguration();
  return {
    errors: [],
    notice: email.enabled ? initialNotice : "Email delivery is not configured, so a verification message was not sent.",
  };
}

export async function signInCustomerAction(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  await connection();
  const configuration = authConfiguration();

  if ("error" in configuration) {
    return { errors: ["Customer accounts are not open yet."], notice: "" };
  }

  const now = new Date();
  const subject = trackingSubject(`sign-in:${await currentClientAddress()}`);
  const sql = await applicationSql();

  if (!(await attemptAllowed(sql, subject, now, signInAttemptLimit))) {
    return { errors: ["Too many sign-in attempts. Wait and try again."], notice: "" };
  }

  try {
    const customer = await authenticateCustomer(sql, text(formData, "email"), text(formData, "password"), now);
    await writeCustomerSession(customer.id);
  } catch (error) {
    if (error instanceof SignInError) {
      await recordAttempt(sql, subject, now);
      return { errors: [error.message], notice: "" };
    }

    return { errors: ["The account was not opened."], notice: "" };
  }

  redirect("/account/orders");
}

export async function signOutCustomerAction(): Promise<void> {
  await connection();
  await clearCustomerSession();
  redirect("/account");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
