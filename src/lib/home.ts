export const collections = [
  {
    index: "01",
    title: "Leather Accessories",
    category: "accessories",
    note: "Collars, cuffs, and other leather accessories.",
    className: "md:col-span-7",
    aspectClassName: "aspect-[4/3] md:aspect-[4/5]",
  },
  {
    index: "02",
    title: "Masks & Headpieces",
    category: "masks",
    note: "Masks and headpieces.",
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/3] md:aspect-[5/4]",
  },
  {
    index: "03",
    title: "Harnesses",
    category: "harnesses",
    note: "Harnesses shaped by hand.",
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/3] md:aspect-[5/4]",
  },
  {
    index: "04",
    title: "Fantasy-Inspired Leatherwork",
    category: "fantasy",
    note: "Fantasy-inspired leather armor and accessories.",
    className: "md:col-span-7",
    aspectClassName: "aspect-[4/3] md:aspect-[16/10]",
  },
] as const;

export const craftPoints = [
  {
    title: "Handcrafted leatherwork",
    body: "Accessories and apparel made by hand, rather than produced as a factory line.",
  },
  {
    title: "Vegetable-tanned leather",
    body: "The leather is 100% vegetable-tanned.",
  },
  {
    title: "Personalized sizing and details",
    body: "Sizing is part of the making, shaped to the person who will wear the piece.",
  },
  {
    title: "Stitching and hardware",
    body: "Stitching and buckle color can be chosen with the piece, along with sizing.",
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
    className: "col-span-2 md:col-span-7",
    aspectClassName: "aspect-[4/3] md:aspect-[5/4]",
    label: "Wide frame",
  },
  {
    className: "md:col-span-5",
    aspectClassName: "aspect-[3/4]",
    label: "Portrait frame",
  },
  {
    className: "md:col-span-5 md:col-start-8",
    aspectClassName: "aspect-[3/4] md:aspect-[4/5]",
    label: "Companion frame",
  },
] as const;
