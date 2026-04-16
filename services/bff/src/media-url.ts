const publicBffBaseUrl =
  process.env.BFF_PUBLIC_URL ?? process.env.NEXT_PUBLIC_BFF_URL ?? "http://127.0.0.1:4000";

export function buildManagedAssetUrl(assetId: string) {
  return `${publicBffBaseUrl}/api/media/assets/${encodeURIComponent(assetId)}/redirect`;
}
