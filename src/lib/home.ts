export const collections = [
  {
    index: "01",
    title: "Leather Accessories",
    category: "accessories",
    note: "Collars, cuffs, and pieces worn close to the body.",
    className: "md:col-span-7",
    aspectClassName: "aspect-[4/5]",
  },
  {
    index: "02",
    title: "Masks & Headpieces",
    category: "masks",
    note: "Masks and headpieces in leather.",
    className: "md:col-span-5 md:mt-20",
    aspectClassName: "aspect-[4/5]",
  },
  {
    index: "03",
    title: "Harnesses",
    category: "harnesses",
    note: "Harnesses shaped by hand.",
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/5]",
  },
  {
    index: "04",
    title: "Fantasy-Inspired Leatherwork",
    category: "fantasy",
    note: "Fantasy-inspired armor and accessories.",
    className: "md:col-span-7 md:mt-12",
    aspectClassName: "aspect-[4/5] md:aspect-[5/4]",
  },
] as const;

export const craftPoints = [
  {
    title: "Vegetable-tanned leather",
    body: "The leather is 100% vegetable-tanned.",
  },
  {
    title: "Stitching and buckle color",
    body: "Both can be chosen with the piece.",
  },
  {
    title: "Sizing",
    body: "Each piece is shaped to the person who will wear it.",
  },
] as const;

export const commissionNotes = [
  {
    title: "Stitching",
    body: "Stitching is chosen with the piece.",
  },
  {
    title: "Buckle color",
    body: "Buckle color is part of the custom work.",
  },
  {
    title: "Sizing",
    body: "Sizing is shaped to the person who will wear the piece.",
  },
] as const;

export const conceptFrames = [
  {
    className: "md:col-span-7 md:row-span-2 md:h-full",
    aspectClassName: "aspect-[4/5] md:aspect-auto md:h-full",
    label: "Wide frame",
  },
  {
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/5]",
    label: "Portrait frame",
  },
  {
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/5]",
    label: "Companion frame",
  },
] as const;
