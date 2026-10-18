import { createAdminUser } from "@/lib/platform/accounts";
import { applicationSql } from "@/lib/platform/runtime";
import { allowsSqlite } from "@/lib/platform/env";
import { logError, logInfo } from "@/lib/platform/log";
import { migrate } from "@/lib/platform/migrate";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const requestedRole = process.env.ADMIN_ROLE?.trim() || "owner";

  if (!email || !password) {
    logError("admin", new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment. This script does not invent an account."));
    process.exitCode = 1;
    return;
  }

  if (requestedRole !== "owner" && requestedRole !== "admin") {
    logError("admin", new Error("ADMIN_ROLE must be owner or admin."));
    process.exitCode = 1;
    return;
  }

  const role = requestedRole;

  try {
    const sql = await applicationSql();

    if (!allowsSqlite()) {
      await migrate(sql);
    }

    const user = await createAdminUser(sql, { email, password, role }, new Date());
    logInfo("admin", `Saved ${user.role} account ${user.email}.`);
  } catch (error) {
    logError("admin", error);
    process.exitCode = 1;
  }
}

void main();
