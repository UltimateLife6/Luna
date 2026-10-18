import { randomUUID } from "node:crypto";
import type { CatalogAssetRecord } from "@/lib/catalog-store/present";
import { isMediaApproval, isPrivatePreviewId, type MediaApproval } from "@/lib/platform/media-policy";
import { one, type Sql } from "@/lib/platform/sql";

export type MediaRecord = {
  id: string;
  storageKey: string;
  contentType: string;
  byteSize: number;
  approval: MediaApproval;
  createdAt: string;
};

export async function insertMediaRecord(sql: Sql, input: { contentType: string; byteSize: number }, now: Date): Promise<MediaRecord> {
  const record: MediaRecord = {
    id: randomUUID(),
    storageKey: "",
    contentType: input.contentType,
    byteSize: input.byteSize,
    approval: "withheld",
    createdAt: now.toISOString(),
  };
  record.storageKey = `media/${record.id}`;

  if (isPrivatePreviewId(record.id)) {
    throw new Error("Image storage refused an unexpected id.");
  }

  await sql.execute("INSERT INTO media_objects (id, storage_key, content_type, byte_size, approval, created_at) VALUES (?, ?, ?, ?, 'withheld', ?)", [
    record.id,
    record.storageKey,
    record.contentType,
    record.byteSize,
    record.createdAt,
  ]);

  return record;
}

export async function getMediaRecord(sql: Sql, id: string): Promise<MediaRecord | null> {
  const row = await one<Record<string, unknown>>(sql, "SELECT id, storage_key, content_type, byte_size, approval, created_at FROM media_objects WHERE id = ?", [id]);
  return row && isMediaApproval(String(row.approval))
    ? {
        id: String(row.id),
        storageKey: String(row.storage_key),
        contentType: String(row.content_type),
        byteSize: Number(row.byte_size),
        approval: String(row.approval) as MediaApproval,
        createdAt: String(row.created_at),
      }
    : null;
}

export async function listMediaRecords(sql: Sql): Promise<MediaRecord[]> {
  const rows = await sql.query<Record<string, unknown>>("SELECT id, storage_key, content_type, byte_size, approval, created_at FROM media_objects ORDER BY created_at");
  return rows.flatMap((row) => {
    if (!isMediaApproval(String(row.approval))) {
      return [];
    }

    return [
      {
        id: String(row.id),
        storageKey: String(row.storage_key),
        contentType: String(row.content_type),
        byteSize: Number(row.byte_size),
        approval: String(row.approval) as MediaApproval,
        createdAt: String(row.created_at),
      },
    ];
  });
}

export async function setMediaApproval(sql: Sql, id: string, approval: MediaApproval): Promise<void> {
  if (isPrivatePreviewId(id) || !isMediaApproval(approval)) {
    throw new Error("That image approval cannot be saved.");
  }

  const result = await sql.execute("UPDATE media_objects SET approval = ? WHERE id = ?", [approval, id]);

  if (result.changes !== 1) {
    throw new Error("That uploaded image was not found.");
  }
}

export function mediaAsset(record: MediaRecord): CatalogAssetRecord {
  return {
    id: record.id,
    src: `/media/${record.id}`,
    shortLabel: record.approval === "approved-for-demo" ? "Uploaded image, approved for the demo" : "Uploaded image, withheld",
    alt: "Uploaded product photograph",
    objectPosition: "center",
  };
}
