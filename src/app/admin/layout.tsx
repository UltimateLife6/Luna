import type { ReactNode } from "react";
import { localAdminGate } from "@/lib/catalog-store/access";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await localAdminGate();
  return children;
}
