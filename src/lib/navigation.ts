export const primaryNav = [
  {
    href: "/shop",
    label: "Shop",
    summary: "Leather accessories, masks, harnesses, and fantasy-inspired work.",
  },
  {
    href: "/custom",
    label: "Custom",
    summary: "Custom stitching, buckle color, and sizing.",
  },
  {
    href: "/gallery",
    label: "Gallery",
    summary: "Photographs of the work.",
  },
  {
    href: "/events",
    label: "Events",
    summary: "Confirmed appearances. No dates are listed.",
  },
  {
    href: "/about",
    label: "About",
    summary: "The maker and the materials.",
  },
  {
    href: "/contact",
    label: "Contact",
    summary: "Instagram and Etsy.",
  },
] as const;

export const cartNav = {
  href: "/cart",
  label: "Cart",
} as const;

export const utilityNav = [
  { href: "/account", label: "Account" },
  { href: "/orders/track", label: "Track" },
  { href: "/policies", label: "Policies" },
] as const;

export type NavItem = (typeof primaryNav)[number];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
