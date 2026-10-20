import { readFile } from "node:fs/promises";
import path from "node:path";
import { imageAssets, privatePreviewAllowed } from "@/data/image-assets";

type PrivatePreviewRouteProps = {
  params: Promise<{ file: string }>;
};

/**
 * Serves an optimized derivative in local development and on a protected Vercel preview.
 * A production deployment returns 404 before any file is read.
 */
export async function GET(_request: Request, { params }: PrivatePreviewRouteProps) {
  if (!privatePreviewAllowed()) {
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

  const derivative = path.join(process.cwd(), "photography", "derivatives", file);

  if (path.basename(derivative) !== file) {
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
