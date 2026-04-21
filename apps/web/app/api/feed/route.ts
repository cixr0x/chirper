import { NextResponse } from "next/server";
import { getHomeFeed } from "../../../lib/bff";
import { getSessionToken } from "../../../lib/session";

export async function GET(request: Request) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return NextResponse.json(
      {
        items: [],
        nextCursor: "",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor")?.trim() ?? "";
  const requestedLimit = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(requestedLimit, 1), 20);
  const payload = await getHomeFeed(sessionToken, limit, cursor || undefined);

  return NextResponse.json(payload);
}
