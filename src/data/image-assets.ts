/**
 * Provenance ledger for photographs that may appear in the demo.
 * `approved-for-private-preview` is local development only.
 * `approved-for-demo` is the only status that may be published.
 */

export type ImageUsageApproval = "approved-for-demo" | "approved-for-private-preview" | "missing" | "ambiguous" | "withheld";

export type GalleryFilter = "harnesses" | "accessories" | "detail";

export type ImageAsset = {
  id: string;
  sourceFilename: string;
  /** Who supplied the file. This is not a photographer credit. */
  source: "luna-fae-leathers";
  suppliedBy: "Luna Fae Leathers";
  approval: ImageUsageApproval;
  /** Public publication stays unverified until `approved-for-demo`. */
  publicPublication: "unverified" | "approved";
  productOrCollection?: string;
  photographerCredit?: string;
  creditStatus: "unverified" | "recorded";
  permittedUsage: string;
  /** Record a restriction when a person is pictured. Omit when no person is shown. */
  modelRelease?: string;
  modelPermission: "unverified" | "recorded";
  /** Visual gallery filter. Not a product or collection name. */
  galleryFilter: GalleryFilter;
  placement: string;
  /** Derivative filename. Private-preview files are not copied into `public/images`. */
  publicFilename?: string;
  /** WebP kept outside `public`. */
  derivativePath: string;
  /** Untouched JPEG kept outside `public`. */
  originalPath: string;
  alt?: string;
  /** Short factual label for gallery navigation. Not a product name. */
  shortLabel: string;
  width: number;
  height: number;
  objectPosition: string;
};

const usage =
  "Supplied directly by Luna Fae Leathers for this website project. The maker knows the site is being developed. Permitted in the private local preview only. Public publication, photographer credit, and model permission are unverified.";

const release = "A person is pictured. Model permission is unverified.";

function suppliedPhoto(
  number: string,
  placement: string,
  alt: string,
  shortLabel: string,
  objectPosition = "center",
  galleryFilter: GalleryFilter = "harnesses",
): ImageAsset {
  const id = `img-${number}`;

  return {
    id,
    sourceFilename: `IMG_${number}.jpeg`,
    source: "luna-fae-leathers",
    suppliedBy: "Luna Fae Leathers",
    approval: "approved-for-private-preview",
    publicPublication: "unverified",
    creditStatus: "unverified",
    permittedUsage: usage,
    modelRelease: release,
    modelPermission: "unverified",
    galleryFilter,
    placement,
    publicFilename: `${id}.webp`,
    derivativePath: `photography/derivatives/${id}.webp`,
    originalPath: `photography/originals/IMG_${number}.jpeg`,
    alt,
    shortLabel,
    width: 1024,
    height: 1024,
    objectPosition,
  };
}

/**
 * All 19 photographs supplied by Luna Fae Leathers.
 * Private-preview permission is not public publication approval.
 */
export const imageAssets: ImageAsset[] = [
  suppliedPhoto(
    "5249",
    "Homepage hero. Also in the gallery.",
    "A person with locs and feathers leans forward on a gold sofa, wearing a black leather harness with silver rings.",
    "Leaning forward in a ring harness",
    "42% 36%",
  ),
  suppliedPhoto(
    "5250",
    "Homepage collection tile 1. The tile title is a browsing category, not a claim that this photograph is that product. Also in the gallery.",
    "A bald person with a beard stands in a dark room, fastening a black leather shoulder harness above a belt of metal rings.",
    "Fastening a shoulder harness",
    "center 40%",
  ),
  suppliedPhoto(
    "5251",
    "Custom creations on the homepage, and the custom page, when approval allows. Also in the gallery. Not a photograph of the maker at work.",
    "Close view of a bald person with a beard adjusting the straps of a black leather chest harness.",
    "Hands adjusting a chest harness",
    "center 48%",
  ),
  suppliedPhoto(
    "5252",
    "Gallery.",
    "A bald person with a beard sits on a gold sofa in a black leather chest harness, holding a leather flogger.",
    "Seated with a harness and flogger",
  ),
  suppliedPhoto(
    "5253",
    "Gallery.",
    "Back view of a person in a black leather harness with silver buckles and rings.",
    "Harness seen from the back",
  ),
  suppliedPhoto(
    "5254",
    "Homepage collection tile 2. The tile title is a browsing category, not a product name for this photograph. Also in the gallery.",
    "A person with curly hair raises both arms, wearing a black leather harness with hanging silver chains.",
    "Harness with hanging chains",
    "center 42%",
  ),
  suppliedPhoto(
    "5255",
    "Gallery.",
    "Close view of a black leather harness with rings and hanging chains, worn over a black top.",
    "Close view of a chain harness",
    "center",
    "detail",
  ),
  suppliedPhoto(
    "5256",
    "Gallery.",
    "Close view of a black leather chest harness with rings, worn over a leopard-print garment.",
    "Chest harness over leopard print",
    "center",
    "detail",
  ),
  suppliedPhoto(
    "5257",
    "Gallery.",
    "A person looks down while adjusting a black leather hip harness with metal rings.",
    "Adjusting a hip harness",
    "center 45%",
  ),
  suppliedPhoto(
    "5258",
    "Homepage gallery preview, wide frame. Also in the gallery.",
    "A person with short hair wears a black lace top and a leather harness with a short silver chain.",
    "Lace top and chain harness",
    "center 28%",
  ),
  suppliedPhoto(
    "5259",
    "About page materials frame, as a photograph of a worn harness. It is not a picture of production. Also in the gallery.",
    "Close view of a black leather harness with a vertical row of rings and a silver chain, worn over black lace.",
    "Vertical ring harness over lace",
    "center",
    "detail",
  ),
  suppliedPhoto(
    "5260",
    "Homepage gallery preview, portrait frame. Also in the gallery.",
    "A person sits on a gold sofa in window light, wearing a black leather harness with a chain.",
    "Seated in window light",
    "center 35%",
  ),
  suppliedPhoto(
    "5261",
    "Homepage gallery preview, companion frame. Also in the gallery.",
    "One person stands in a leopard-print top and black leather harness while another person sits below.",
    "Two people, one in a harness",
    "center 40%",
  ),
  suppliedPhoto(
    "5262",
    "Gallery.",
    "Close portrait of a person wearing a patterned headwrap, a fine face chain, and a dark leather collar.",
    "Portrait with a leather collar",
    "center 55%",
    "accessories",
  ),
  suppliedPhoto(
    "5263",
    "Gallery.",
    "A person holds the straps of a black leather harness crossed with silver rings and buckles.",
    "Holding a crossed harness",
  ),
  suppliedPhoto(
    "5264",
    "Homepage collection tile 3. The tile title is a browsing category, not a product name for this photograph. Also in the gallery.",
    "Back view of a person wearing a black leather harness with silver rings and studs.",
    "Back of a studded harness",
  ),
  suppliedPhoto(
    "5265",
    "Alternate for the custom section. Not placed beside the primary custom photograph. Also in the gallery.",
    "Profile of a person in a black corset and a leather harness with silver rings.",
    "Profile in a corset and harness",
    "center 42%",
  ),
  suppliedPhoto(
    "5266",
    "Homepage collection tile 4. The tile title is a browsing category, not a product name for this photograph. Also in the gallery.",
    "A person faces the camera in a black corset, a leather harness, and a belt of linked silver rings.",
    "Corset, harness, and ring belt",
    "center 40%",
  ),
  suppliedPhoto(
    "5267",
    "Alternate homepage hero. Not shown beside the primary hero. Also in the gallery.",
    "A person stands beside a window in a black corset, leather harness, and a belt of linked rings.",
    "Standing beside a window",
    "62% 38%",
  ),
];

/** Gallery order keeps similar neighboring frames apart. */
export const galleryOrder = [
  "img-5249",
  "img-5250",
  "img-5254",
  "img-5263",
  "img-5265",
  "img-5258",
  "img-5256",
  "img-5261",
  "img-5252",
  "img-5266",
  "img-5264",
  "img-5255",
  "img-5260",
  "img-5257",
  "img-5262",
  "img-5251",
  "img-5267",
  "img-5253",
  "img-5259",
] as const;

export const photoPlacements = {
  hero: "img-5249",
  heroAlternate: "img-5267",
  collections: ["img-5250", "img-5254", "img-5264", "img-5266"],
  galleryPreview: ["img-5258", "img-5260", "img-5261"],
  custom: "img-5251",
  customAlternate: "img-5265",
  aboutMaterials: "img-5259",
} as const;

export const imageSlots = [
  { id: "hero", placement: "Homepage hero", ratio: "4:5", longEdge: 2000, assetId: photoPlacements.hero },
  { id: "hero-alternate", placement: "Homepage hero alternate", ratio: "4:5", longEdge: 2000, assetId: photoPlacements.heroAlternate },
  { id: "collections", placement: "Homepage collection tiles", ratio: "4:5 or 16:10", longEdge: 1600, assetId: photoPlacements.collections.join(", ") },
  { id: "craft", placement: "Homepage craftsmanship", ratio: "4:5", longEdge: 1600, assetId: "unassigned" },
  { id: "gallery-preview", placement: "Homepage gallery preview", ratio: "4:3, 3:4, or 4:5", longEdge: 1600, assetId: photoPlacements.galleryPreview.join(", ") },
  { id: "about-making", placement: "About, making frame", ratio: "4:5", longEdge: 1600, assetId: "unassigned" },
  { id: "about-materials", placement: "About, materials frame", ratio: "4:3", longEdge: 1600, assetId: photoPlacements.aboutMaterials },
  { id: "gallery", placement: "Gallery", ratio: "1:1 source", longEdge: 2000, assetId: "all private-preview photographs" },
  { id: "product", placement: "Verified product pages only", ratio: "4:5", longEdge: 1600, assetId: "unassigned" },
  { id: "custom", placement: "Custom creations", ratio: "1:1", longEdge: 1600, assetId: photoPlacements.custom },
] as const;

export function assetById(id: string): ImageAsset | undefined {
  return imageAssets.find((item) => item.id === id);
}

function assetForFilename(src: string | undefined): ImageAsset | undefined {
  if (!src || !src.startsWith("/") || src.startsWith("//")) {
    return undefined;
  }

  const filename = src.slice(src.lastIndexOf("/") + 1);
  return imageAssets.find((item) => item.publicFilename === filename);
}

/** Public files only. Private-preview photographs never use this path. */
export function approvedPublicPath(src: string | undefined): string | undefined {
  const asset = assetForFilename(src);

  if (!asset?.publicFilename || !asset.alt || asset.approval !== "approved-for-demo") {
    return undefined;
  }

  return `/images/${asset.publicFilename}`;
}

/**
 * Path the current runtime may render.
 * Private-preview photographs resolve only while `NODE_ENV` is development.
 */
export function displayPath(src: string | undefined): string | undefined {
  if (src && /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(src)) {
    return src;
  }

  const asset = assetForFilename(src);

  if (!asset?.publicFilename || !asset.alt) {
    return undefined;
  }

  if (asset.approval === "approved-for-demo") {
    return `/images/${asset.publicFilename}`;
  }

  if (asset.approval === "approved-for-private-preview" && process.env.NODE_ENV === "development") {
    return `/private-preview/${asset.publicFilename}`;
  }

  return undefined;
}

export function assetForPublicPath(src: string | undefined): ImageAsset | undefined {
  const path = displayPath(src);
  return path ? assetForFilename(path) : undefined;
}

export function approvedPresentation(id: string): { src: string; alt: string; label: string; objectPosition: string } | undefined {
  const asset = assetById(id);

  if (!asset?.publicFilename || !asset.alt) {
    return undefined;
  }

  const src = displayPath(`/images/${asset.publicFilename}`);

  if (!src) {
    return undefined;
  }

  return {
    src,
    alt: asset.alt,
    label: asset.shortLabel,
    objectPosition: asset.objectPosition,
  };
}
