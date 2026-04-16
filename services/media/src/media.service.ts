import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "./prisma.service";

type MediaAsset = {
  assetId: string;
  uploadId: string;
  ownerUserId: string;
  purpose: string;
  sourceUrl: string;
  mimeType: string;
  status: string;
  createdAt: string;
};

const supportedPurposes = new Set(["profile_avatar", "profile_banner"]);

@Injectable()
export class MediaLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssetFromSource(input: {
    ownerUserId: string;
    sourceUrl: string;
    purpose: string;
  }): Promise<MediaAsset> {
    const ownerUserId = sanitizeOwnerUserId(input.ownerUserId);
    const sourceUrl = sanitizeSourceUrl(input.sourceUrl);
    const purpose = sanitizePurpose(input.purpose);
    const uploadId = `upload_${randomBytes(16).toString("hex")}`;
    const assetId = `asset_${randomBytes(16).toString("hex")}`;
    const storageKey = `${purpose}/${assetId}`;
    const mimeType = inferMimeType(sourceUrl);

    await this.prisma.$transaction(async (tx) => {
      await tx.upload.create({
        data: {
          id: uploadId,
          ownerUserId,
          purpose,
          sourceUrl,
          status: "ready",
          completedAt: new Date(),
        },
      });

      await tx.asset.create({
        data: {
          id: assetId,
          uploadId,
          ownerUserId,
          purpose,
          sourceUrl,
          storageKey,
          mimeType,
          status: "ready",
        },
      });

      await tx.variant.create({
        data: {
          id: `variant_${randomBytes(16).toString("hex")}`,
          assetId,
          kind: "original",
          storageKey,
        },
      });
    });

    return this.getAssetById(assetId);
  }

  async getAssetById(assetId: string): Promise<MediaAsset> {
    const normalizedAssetId = sanitizeAssetId(assetId);
    const asset = await this.prisma.asset.findUnique({
      where: { id: normalizedAssetId },
    });

    if (!asset) {
      throw new Error("Asset not found.");
    }

    return {
      assetId: asset.id,
      uploadId: asset.uploadId,
      ownerUserId: asset.ownerUserId,
      purpose: asset.purpose,
      sourceUrl: asset.sourceUrl,
      mimeType: asset.mimeType,
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
    };
  }

  async getAssetsByIds(assetIds: string[]) {
    const normalizedAssetIds = [...new Set(assetIds.map((assetId) => assetId.trim()).filter(Boolean))];
    if (normalizedAssetIds.length === 0) {
      return [] as MediaAsset[];
    }

    const assets = await this.prisma.asset.findMany({
      where: {
        id: {
          in: normalizedAssetIds,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assets.map((asset) => ({
      assetId: asset.id,
      uploadId: asset.uploadId,
      ownerUserId: asset.ownerUserId,
      purpose: asset.purpose,
      sourceUrl: asset.sourceUrl,
      mimeType: asset.mimeType,
      status: asset.status,
      createdAt: asset.createdAt.toISOString(),
    }));
  }
}

function sanitizeOwnerUserId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Owner user ID is required.");
  }

  if (trimmed.length > 64) {
    throw new Error("Owner user ID must be 64 characters or fewer.");
  }

  return trimmed;
}

function sanitizePurpose(value: string) {
  const trimmed = value.trim();
  if (!supportedPurposes.has(trimmed)) {
    throw new Error("Unsupported media purpose.");
  }

  return trimmed;
}

function sanitizeSourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Source URL is required.");
  }

  if (trimmed.length > 255) {
    throw new Error("Source URL must be 255 characters or fewer.");
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("Source URL must be a valid http or https URL.");
  }

  return trimmed;
}

function sanitizeAssetId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Asset ID is required.");
  }

  if (trimmed.length > 64) {
    throw new Error("Asset ID must be 64 characters or fewer.");
  }

  return trimmed;
}

function inferMimeType(sourceUrl: string) {
  const normalizedPath = new URL(sourceUrl).pathname.toLowerCase();
  if (normalizedPath.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedPath.endsWith(".jpg") || normalizedPath.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedPath.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalizedPath.endsWith(".gif")) {
    return "image/gif";
  }

  return "application/octet-stream";
}
