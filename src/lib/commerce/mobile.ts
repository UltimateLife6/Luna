export const mobileCheckoutFieldClass =
  "mt-2 min-h-12 w-full border border-ivory/20 bg-transparent px-3 py-3 text-base text-ivory sm:text-sm";

export function checkoutCanStart(input: { blockers: number; unavailableLines: number }): boolean {
  return input.blockers === 0 && input.unavailableLines === 0;
}
