import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminSectionNav({ current }: { current: "records" | "orders" | "quotes" | "policies" }) {
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("inline-flex min-h-11 items-center text-xs uppercase tracking-[0.16em]", active ? "text-ivory" : "text-silver")}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Catalog admin" className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
      {item("/admin/products", "Records", current === "records")}
      {item("/admin/orders", "Orders", current === "orders")}
      {item("/admin/quotes", "Quotes", current === "quotes")}
      {item("/admin/policies", "Policies", current === "policies")}
    </nav>
  );
}
