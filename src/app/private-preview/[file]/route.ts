import { readFile } from "node:fs/promises";
import path from "node:path";
import { imageAssets } from "@/data/image-assets";

type PrivatePreviewRouteProps = {
  params: Promise<{ file: string }>;
};

/**
 * Serves a private-preview derivative during `next dev` only.
 * Production returns 404 before any file is read.
 */
export async function GET(_request: Request, { params }: PrivatePreviewRouteProps) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const { file } = await params;

  if (!/^img-52(?:49|5\d|6[0-7])\.webp$/.test(file)) {
    return new Response(null, { status: 404 });
  }

  const asset = imageAssets.find((item) => item.publicFilename === file && item.approval === "approved-for-private-preview");

  if (!asset) {
    return new Response(null, { status: 404 });
  }

  const root = path.resolve(process.cwd(), "photography", "derivatives");
  const derivative = path.resolve(process.cwd(), asset.derivativePath);

  if (derivative !== path.join(root, file)) {
    return new Response(null, { status: 404 });
  }

  try {
    const body = await readFile(derivative);
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noimageindex",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
