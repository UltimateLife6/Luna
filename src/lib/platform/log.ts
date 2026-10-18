const secretPattern = /(sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/)[^\s'"]+/gi;

export function redact(value: string): string {
  return value.replace(secretPattern, "[redacted]");
}

export function logInfo(event: string, message: string): void {
  console.info(JSON.stringify({ level: "info", event, message: redact(message) }));
}

export function logError(event: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(JSON.stringify({ level: "error", event, message: redact(message) }));
}
