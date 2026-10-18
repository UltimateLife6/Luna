/** Admin writes and the admin UI stay on the local dev server or the test runner. */
export function isLocalCatalogRuntime(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "development" || nodeEnv === "test";
}
