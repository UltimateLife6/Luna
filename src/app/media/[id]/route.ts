import { connection } from "next/server";
import { getMediaRecord } from "@/lib/platform/media-records";
import { mediaAccessDecision } from "@/lib/platform/media-policy";
import { readMediaBytes } from "@/lib/platform/media-store";
import { applicationSql } from "@/lib/platform/runtime";

type MediaRouteProps = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: MediaRouteProps) {
  await connection();
  const { id } = await params;
  const record = await getMediaRecord(await applicationSql(), id);

  if (mediaAccessDecision({ id, approval: record?.approval ?? null, actor: "public" }) !== "allow" || !record) {
    return new Response(null, { status: 404 });
  }

  const stored = await readMediaBytes(id);

  if (!stored) {
    return new Response(null, { status: 404 });
  }

  return new Response(Buffer.from(stored.bytes), {
    headers: {
      "Content-Type": record.contentType,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    },
  });
}
