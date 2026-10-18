import { connection, type NextRequest } from "next/server";
import { authKit } from "@/auth";

async function handlers(request: NextRequest): Promise<Response> {
  await connection();
  const kit = authKit();

  if (!kit) {
    return Response.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  return request.method === "POST" ? kit.handlers.POST(request) : kit.handlers.GET(request);
}

export function GET(request: NextRequest): Promise<Response> {
  return handlers(request);
}

export function POST(request: NextRequest): Promise<Response> {
  return handlers(request);
}
