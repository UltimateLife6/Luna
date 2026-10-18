import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";
import { put } from "@vercel/blob";
import { mediaBackend } from "@/lib/platform/env";
import type { ImageContentType } from "@/lib/platform/media-policy";

const mediaId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mediaObjectKey(id: string): string {
  if (!mediaId.test(id)) {
    throw new Error("Image storage refused an unexpected id.");
  }

  return `media/${id}`;
}

export function localMediaRoot(): string {
  return process.env.MEDIA_LOCAL_DIR?.trim() || path.join(process.cwd(), "data", "media");
}

export async function putMediaBytes(id: string, bytes: Uint8Array, contentType: ImageContentType): Promise<void> {
  const key = mediaObjectKey(id);
  const backend = mediaBackend();

  if (backend === "blob") {
    await put(key, Buffer.from(bytes), {
      access: "private",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return;
  }

  if (backend === "local") {
    const file = localMediaFile(id);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return;
  }

  throw new Error("Image storage is not configured.");
}

export async function readMediaBytes(id: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const key = mediaObjectKey(id);
  const backend = mediaBackend();

  if (backend === "blob") {
    const result = await get(key, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN, useCache: false });

    if (!result || result.statusCode === 304 || !result.stream) {
      return null;
    }

    return {
      bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
      contentType: result.blob.contentType ?? "application/octet-stream",
    };
  }

  if (backend !== "local") {
    return null;
  }

  try {
    const bytes = await readFile(/*turbopackIgnore: true*/ localMediaFile(id));
    return { bytes, contentType: "application/octet-stream" };
  } catch {
    return null;
  }
}

export async function deleteMediaBytes(id: string): Promise<void> {
  if (mediaBackend() !== "local") {
    return;
  }

  await rm(localMediaFile(id), { force: true });
}

function localMediaFile(id: string): string {
  mediaObjectKey(id);
  const override = process.env.MEDIA_LOCAL_DIR?.trim();

  if (!override) {
    return path.join(process.cwd(), "data/media", id);
  }

  const root = path.resolve(/*turbopackIgnore: true*/ override);
  const file = path.resolve(/*turbopackIgnore: true*/ root, id);

  if (file !== path.join(/*turbopackIgnore: true*/ root, id)) {
    throw new Error("Image storage refused an unexpected id.");
  }

  return file;
}
