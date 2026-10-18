import type { ProductCategory } from "@/types/catalog";

export const creationTypes = [
  { id: "harness", label: "Harness" },
  { id: "mask", label: "Mask or headpiece" },
  { id: "accessory", label: "Collar or accessory" },
  { id: "fantasy", label: "Fantasy-inspired leatherwork" },
  { id: "other", label: "Other custom creation" },
] as const;

export const leatherPreferences = [
  { id: "black", label: "Black" },
  { id: "cognac", label: "Cognac" },
  { id: "oxblood", label: "Oxblood" },
  { id: "natural", label: "Natural" },
  { id: "unsure", label: "Unsure" },
] as const;

export const hardwarePreferences = [
  { id: "silver", label: "Silver" },
  { id: "gold", label: "Gold" },
  { id: "black", label: "Black" },
  { id: "unsure", label: "Unsure" },
] as const;

export const sizingPreferences = [
  { id: "standard", label: "Standard size inquiry" },
  { id: "custom", label: "Custom measurements" },
  { id: "guidance", label: "Need sizing guidance" },
] as const;

export const commissionSteps = [
  { id: "type", label: "Creation" },
  { id: "leather", label: "Leather" },
  { id: "hardware", label: "Hardware" },
  { id: "sizing", label: "Sizing" },
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
] as const;

export type CreationType = (typeof creationTypes)[number]["id"];
export type LeatherPreference = (typeof leatherPreferences)[number]["id"];
export type HardwarePreference = (typeof hardwarePreferences)[number]["id"];
export type SizingPreference = (typeof sizingPreferences)[number]["id"];

export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const maxImageBytes = 5 * 1024 * 1024;

export function isCreationType(value: string | null): value is CreationType {
  return creationTypes.some((option) => option.id === value);
}

export function creationTypeForCategory(category: ProductCategory): CreationType {
  switch (category) {
    case "accessories":
      return "accessory";
    case "masks":
      return "mask";
    case "harnesses":
      return "harness";
    case "fantasy":
      return "fantasy";
  }
}

export function optionLabel<T extends string>(options: readonly { id: T; label: string }[], id: T | undefined): string {
  return options.find((option) => option.id === id)?.label ?? "Not chosen";
}
