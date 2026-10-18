import type { CatalogImage, CustomizationGroup, Product } from "@/types/catalog";

/**
 * Fictional interface examples for the shop demonstration.
 * None of these designs, specifications, or names belong to Luna Fae Leathers.
 * Do not add prices, stock counts, reviews, sales figures, or unapproved photographs.
 */
const leatherColors: CustomizationGroup = {
  kind: "leather-color",
  label: "Leather color",
  note: "Example colors for this screen. Not a confirmed palette.",
  options: [
    { id: "oxblood", label: "Oxblood" },
    { id: "black", label: "Black" },
    { id: "cognac", label: "Cognac" },
    { id: "forest", label: "Forest" },
  ],
};

const hardwareFinishes: CustomizationGroup = {
  kind: "hardware",
  label: "Hardware finish",
  note: "Example finishes for this screen. Not confirmed hardware.",
  options: [
    { id: "brass", label: "Brass" },
    { id: "nickel", label: "Nickel" },
    { id: "blackened", label: "Blackened steel" },
  ],
};

const exampleSizes: CustomizationGroup = {
  kind: "sizing",
  label: "Sizing",
  note: "Example size labels only. They are not measurements and they are not a fit guide.",
  options: [
    { id: "example-s", label: "Example S" },
    { id: "example-m", label: "Example M" },
    { id: "example-l", label: "Example L" },
  ],
};

const sizingUnavailable = "No measurements are available for this example.";

export const products: Product[] = [
  {
    slug: "example-narrow-collar",
    name: "Example Narrow Collar",
    summary: "A fictional narrow collar used to show an accessory card.",
    description:
      "Drawn for the interface only. The band, the hardware, and the proportions are invented, and this is not a Luna Fae Leathers design.",
    category: "accessories",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Narrow Collar", ["Front frame", "Closure frame", "Edge frame"]),
    customization: [leatherColors, hardwareFinishes, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-wrist-cuffs",
    name: "Example Wrist Cuffs",
    summary: "A fictional pair of cuffs used to show a second accessory.",
    description:
      "The pair exists so the catalog can demonstrate related accessories. No listing, measurement, or material sample was copied to make it.",
    category: "accessories",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Wrist Cuffs", ["Pair frame", "Buckle frame"]),
    customization: [leatherColors, hardwareFinishes, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-half-mask",
    name: "Example Half Mask",
    summary: "A fictional half mask used to show the mask category.",
    description:
      "The silhouette is an interface sample. It is not based on a published Luna Fae mask, and the frame is not a photograph of one.",
    category: "masks",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Half Mask", ["Front frame", "Profile frame", "Strap frame"]),
    customization: [leatherColors, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-brow-headpiece",
    name: "Example Brow Headpiece",
    summary: "A fictional brow band used to show a headpiece beside the mask.",
    description:
      "Included so the mask category has a second concept card. The ornament and the strap are not taken from a real piece.",
    category: "masks",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Brow Headpiece", ["Front frame", "Ornament frame"]),
    customization: [leatherColors, hardwareFinishes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-chest-harness",
    name: "Example Chest Harness",
    summary: "A fictional chest harness used to show the harness category.",
    description:
      "The strap layout is invented for browsing and filtering. It is not a pattern from the maker, and it cannot be ordered.",
    category: "harnesses",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Chest Harness", ["Front frame", "Back frame", "Hardware frame"]),
    customization: [leatherColors, hardwareFinishes, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-hip-harness",
    name: "Example Hip Harness",
    summary: "A fictional hip harness used as the related harness example.",
    description:
      "A second harness card, so the category filter and the related-examples row both have something to show. The construction is not real.",
    category: "harnesses",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Hip Harness", ["Front frame", "Side frame"]),
    customization: [leatherColors, hardwareFinishes, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-shoulder-piece",
    name: "Example Shoulder Piece",
    summary: "A fictional shoulder piece used to show fantasy-inspired leatherwork.",
    description:
      "The armor-like shape is a concept for the category tile. It is not fantasy armor made by Luna Fae Leathers, and no specifications are claimed.",
    category: "fantasy",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Shoulder Piece", ["Outer frame", "Interior frame", "Edge frame"]),
    customization: [leatherColors, hardwareFinishes],
    sizingNotes: sizingUnavailable,
  },
  {
    slug: "example-forearm-bracer",
    name: "Example Forearm Bracer",
    summary: "A fictional bracer used as the related fantasy example.",
    description:
      "Paired with the shoulder piece so the fantasy category can be filtered and cross-linked. The bracer is not a product for sale.",
    category: "fantasy",
    status: "demo",
    attribution: "fictional-example",
    images: frames("Example Forearm Bracer", ["Outer frame", "Closure frame"]),
    customization: [leatherColors, hardwareFinishes, exampleSizes],
    sizingNotes: sizingUnavailable,
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getRelatedProducts(slug: string): Product[] {
  const product = getProduct(slug);

  if (!product) {
    return [];
  }

  return products.filter((item) => item.slug !== product.slug && item.category === product.category);
}

function frames(name: string, labels: string[]): CatalogImage[] {
  return labels.map((label) => ({
    alt: `Concept imagery for ${name}. No merchandise is shown. ${label}.`,
    source: "concept",
    approval: "concept",
    label,
  }));
}
