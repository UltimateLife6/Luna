import { allowsSqlite, assertStripeTestConfiguration } from "@/lib/platform/env";
import { logError, logInfo } from "@/lib/platform/log";
import { migrate } from "@/lib/platform/migrate";
import { applicationSql } from "@/lib/platform/runtime";

export async function registerNode(): Promise<void> {
  try {
    assertStripeTestConfiguration(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    logError("stripe", error);
    throw error;
  }

  if (allowsSqlite()) {
    logInfo("database", "Using local SQLite. Hosted environments require DATABASE_URL.");
    return;
  }

  try {
    const versions = await migrate(await applicationSql());
    logInfo("database", `PostgreSQL migrations applied: ${versions.join(", ") || "already current"}.`);
  } catch (error) {
    logError("database", error);
    throw error;
  }
}
