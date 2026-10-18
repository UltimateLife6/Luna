export const primaryNav = [
  {
    href: "/shop",
    label: "Shop",
    summary: "Fictional concept examples for browsing. None can be purchased.",
  },
  {
    href: "/custom",
    label: "Custom",
    summary: "A guided commission demonstration. Nothing is submitted.",
  },
  {
    href: "/gallery",
    label: "Gallery",
    summary: "Concept frames until approved photographs are placed.",
  },
  {
    href: "/events",
    label: "Events",
    summary: "Confirmed appearances. No dates are listed.",
  },
  {
    href: "/about",
    label: "About",
    summary: "The maker, the materials, and what this demo does not claim.",
  },
  {
    href: "/contact",
    label: "Contact",
    summary: "A contact demonstration. Notes are not sent.",
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
