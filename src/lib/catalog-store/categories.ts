/**
 * Browsing categories already used by the concept shop.
 * Seeding them does not create products or inventory.
 */
export const seededCategories = [
  {
    id: "cat-accessories",
    slug: "accessories",
    name: "Leather Accessories",
    description: "Browsing category. Products appear here only after they are published in the local catalog.",
    sortOrder: 1,
  },
  {
    id: "cat-masks",
    slug: "masks",
    name: "Masks & Headpieces",
    description: "Browsing category. Products appear here only after they are published in the local catalog.",
    sortOrder: 2,
  },
  {
    id: "cat-harnesses",
    slug: "harnesses",
    name: "Harnesses",
    description: "Browsing category. Products appear here only after they are published in the local catalog.",
    sortOrder: 3,
  },
  {
    id: "cat-fantasy",
    slug: "fantasy",
    name: "Fantasy-Inspired Leatherwork",
    description: "Browsing category. Products appear here only after they are published in the local catalog.",
    sortOrder: 4,
  },
] as const;

export type SeededCategory = (typeof seededCategories)[number];
