import { NextResponse } from "next/server";

const bffBaseUrl =
  process.env.BFF_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_BFF_URL ??
  "http://127.0.0.1:4000";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  const response = await fetch(
    `${bffBaseUrl}/api/media/assets/${encodeURIComponent(assetId)}/redirect`,
    {
      cache: "no-store",
      redirect: "manual",
    },
  );

  const location = response.headers.get("location");
  if (location) {
    return NextResponse.redirect(location);
  }

  return NextResponse.json(
    { error: response.status === 404 ? "Asset not found." : "Asset unavailable." },
    { status: response.status === 404 ? 404 : 502 },
  );
}
