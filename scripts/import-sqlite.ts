import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { catalogDatabasePath } from "@/lib/catalog-store/db";
import { assertDatabaseUrl } from "@/lib/platform/env";
import { importSqliteCatalog } from "@/lib/platform/import-sqlite";
import { logError, logInfo } from "@/lib/platform/log";
import { migrate } from "@/lib/platform/migrate";
import { neonSql } from "@/lib/platform/postgres";

async function main(): Promise<void> {
  const sourcePath = process.env.CATALOG_DB_PATH || catalogDatabasePath();

  if (!existsSync(sourcePath)) {
    logError("import", new Error("The local SQLite catalog file was not found."));
    process.exitCode = 1;
    return;
  }

  const source = new DatabaseSync(sourcePath);

  try {
    const destination = neonSql(assertDatabaseUrl(process.env.DATABASE_URL));
    await migrate(destination);
    const result = await importSqliteCatalog(source, destination);
    logInfo(
      "import",
      `Imported ${result.products} products, skipped ${result.skippedProducts} products and ${result.skippedImages} private-preview images, copied ${result.quotes} quotes and ${result.shippingRates} shipping rates.`,
    );
  } catch (error) {
    logError("import", error);
    process.exitCode = 1;
  } finally {
    source.close();
  }
}

void main();
