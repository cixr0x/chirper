import { NextResponse } from "next/server";
import { getRealtimeEvents } from "../../../../lib/bff";
import { getSessionToken } from "../../../../lib/session";

export async function GET(request: Request) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return NextResponse.json(
      {
        nextSequence: 0,
        events: [],
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const afterSequence = Number(url.searchParams.get("afterSequence") ?? "0");
  const limit = Number(url.searchParams.get("limit") ?? "12");

  const payload = await getRealtimeEvents(
    sessionToken,
    Number.isNaN(afterSequence) ? 0 : afterSequence,
    Number.isNaN(limit) ? 12 : limit,
  );

  return NextResponse.json(payload);
}
