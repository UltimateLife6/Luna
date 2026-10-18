export const collections = [
  {
    index: "01",
    title: "Leather Accessories",
    category: "accessories",
    note: "Concept examples. Not a stock list.",
    className: "md:col-span-7",
    aspectClassName: "aspect-[4/3] md:aspect-[4/5]",
  },
  {
    index: "02",
    title: "Masks & Headpieces",
    category: "masks",
    note: "Concept examples. Not a stock list.",
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/3] md:aspect-[5/4]",
  },
  {
    index: "03",
    title: "Harnesses",
    category: "harnesses",
    note: "Concept examples. Not a stock list.",
    className: "md:col-span-5",
    aspectClassName: "aspect-[4/3] md:aspect-[5/4]",
  },
  {
    index: "04",
    title: "Fantasy-Inspired Leatherwork",
    category: "fantasy",
    note: "Concept examples. Not a stock list.",
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
    body: "The maker’s Instagram bio describes the leather as 100% vegetable-tanned.",
  },
  {
    title: "Personalized sizing and details",
    body: "Sizing is part of the making, shaped to the person who will wear the piece.",
  },
  {
    title: "Stitching and hardware",
    body: "Stitching and buckle color are the customizations described publicly. No further finishes are claimed here.",
  },
] as const;

export const commissionNotes = [
  {
    title: "Leather color",
    body: "The demonstration can ask for a color. No palette is published here, because none has been confirmed.",
  },
  {
    title: "Hardware",
    body: "Buckle color is part of the public customization. The hardware choices in the demonstration are examples.",
  },
  {
    title: "Sizing",
    body: "The demonstration offers sizing paths. It does not collect measurements, and it cannot submit a request.",
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
