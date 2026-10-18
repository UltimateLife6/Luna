export const maxMediaBytes = 8 * 1024 * 1024;

export type MediaApproval = "withheld" | "approved-for-demo";

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

const privatePreviewId = /^img-52(?:49|5\d|6[0-7])$/i;

export function isPrivatePreviewId(id: string): boolean {
  return privatePreviewId.test(id);
}

export function inspectImage(bytes: Uint8Array, declaredType: string): { contentType: ImageContentType } | { error: string } {
  if (bytes.byteLength < 1) {
    return { error: "Choose an image file." };
  }

  if (bytes.byteLength > maxMediaBytes) {
    return { error: "Images must be 8 MB or smaller." };
  }

  const contentType = detectedType(bytes);

  if (!contentType) {
    return { error: "Upload a JPEG, PNG, or WebP image." };
  }

  if (declaredType && declaredType !== "application/octet-stream" && declaredType !== contentType) {
    return { error: "The file contents do not match the declared image type." };
  }

  return { contentType };
}

export function mediaAccessDecision(input: { id: string; approval: MediaApproval | null; actor: "public" | "admin" }): "allow" | "deny" {
  if (isPrivatePreviewId(input.id) || !input.approval) {
    return "deny";
  }

  if (input.actor === "admin") {
    return "allow";
  }

  return input.approval === "approved-for-demo" ? "allow" : "deny";
}

export function isMediaApproval(value: string): value is MediaApproval {
  return value === "withheld" || value === "approved-for-demo";
}

function detectedType(bytes: Uint8Array): ImageContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}
