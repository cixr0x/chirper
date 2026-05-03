import { NextResponse } from "next/server";
import { searchUsers } from "../../../../lib/bff";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedLimit = Number(url.searchParams.get("limit") ?? "5");
  const limit = Number.isNaN(requestedLimit) ? 5 : Math.min(Math.max(requestedLimit, 1), 10);

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const payload = await searchUsers(query, limit);

  return NextResponse.json(payload);
}
