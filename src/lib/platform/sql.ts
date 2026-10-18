export type SqlDialect = "sqlite" | "postgres";

export type Sql = {
  dialect: SqlDialect;
  exec(statement: string): Promise<void>;
  query<T extends Record<string, unknown>>(statement: string, params?: readonly unknown[]): Promise<T[]>;
  execute(statement: string, params?: readonly unknown[]): Promise<{ changes: number }>;
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
};

export function toPostgres(statement: string): string {
  let index = 0;
  return statement.replace(/\?/g, () => `$${++index}`);
}

export function splitSql(source: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (char === "'") {
      if (quoted && source[index + 1] === "'") {
        current += "''";
        index += 1;
        continue;
      }

      quoted = !quoted;
    }

    if (char === ";" && !quoted) {
      if (current.trim()) {
        statements.push(current.trim());
      }

      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter((statement) => statement.split("\n").some((line) => line.trim() && !line.trim().startsWith("--")));
}

export async function one<T extends Record<string, unknown>>(sql: Sql, statement: string, params: readonly unknown[] = []): Promise<T | undefined> {
  const rows = await sql.query<T>(statement, params);
  return rows[0];
}

export function integer(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }

  return Number.NaN;
}
