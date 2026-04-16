import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "./prisma.service";

type UserProfile = {
  userId: string;
  bio: string;
  location: string;
  avatarAssetId: string;
  bannerAssetId: string;
  avatarUrl: string;
  bannerUrl: string;
  links: {
    label: string;
    url: string;
  }[];
};

@Injectable()
export class ProfileDirectoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createProfile(input: {
    userId: string;
    bio?: string;
    location?: string;
    avatarAssetId?: string;
    bannerAssetId?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    links?: {
      label?: string;
      url?: string;
    }[];
  }): Promise<UserProfile> {
    const userId = input.userId.trim();
    const bio = input.bio?.trim() ?? "";
    const location = input.location?.trim() ?? "";
    const avatarAssetId = sanitizeAssetId(input.avatarAssetId ?? "", "Avatar asset");
    const bannerAssetId = sanitizeAssetId(input.bannerAssetId ?? "", "Banner asset");
    const avatarUrl = input.avatarUrl?.trim() ?? "";
    const bannerUrl = input.bannerUrl?.trim() ?? "";
    const links = sanitizeLinks(input.links ?? []);

    return this.upsertProfile({
      userId,
      bio,
      location,
      avatarAssetId,
      bannerAssetId,
      avatarUrl,
      bannerUrl,
      links,
    });
  }

  async updateProfile(input: {
    userId: string;
    bio?: string;
    location?: string;
    avatarAssetId?: string;
    bannerAssetId?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    links?: {
      label?: string;
      url?: string;
    }[];
  }): Promise<UserProfile> {
    const userId = input.userId.trim();
    const bio = sanitizeBio(input.bio ?? "");
    const location = sanitizeLocation(input.location ?? "");
    const avatarAssetId = sanitizeAssetId(input.avatarAssetId ?? "", "Avatar asset");
    const bannerAssetId = sanitizeAssetId(input.bannerAssetId ?? "", "Banner asset");
    const avatarUrl = sanitizeAssetUrl(input.avatarUrl ?? "", "Avatar URL");
    const bannerUrl = sanitizeAssetUrl(input.bannerUrl ?? "", "Banner URL");
    const links = sanitizeLinks(input.links ?? []);

    return this.upsertProfile({
      userId,
      bio,
      location,
      avatarAssetId,
      bannerAssetId,
      avatarUrl,
      bannerUrl,
      links,
    });
  }

  async getProfileByUserId(userId: string): Promise<UserProfile> {
    const [profile, links] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { userId },
      }),
      this.prisma.profileLink.findMany({
        where: { userId },
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

    if (!profile) {
      return {
        userId,
        bio: "",
        location: "",
        avatarAssetId: "",
        bannerAssetId: "",
        avatarUrl: "",
        bannerUrl: "",
        links: [],
      };
    }

    return {
      userId,
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      avatarAssetId: profile.avatarAssetId ?? "",
      bannerAssetId: profile.bannerAssetId ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      bannerUrl: profile.bannerUrl ?? "",
      links: links.map((link) => ({
        label: link.label,
        url: link.url,
      })),
    };
  }

  private async upsertProfile(input: {
    userId: string;
    bio: string;
    location: string;
    avatarAssetId: string;
    bannerAssetId: string;
    avatarUrl: string;
    bannerUrl: string;
    links: {
      label: string;
      url: string;
    }[];
  }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { userId: input.userId },
        update: {
          bio: input.bio,
          location: input.location,
          avatarAssetId: input.avatarAssetId || null,
          bannerAssetId: input.bannerAssetId || null,
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl,
        },
        create: {
          id: `profile_${randomBytes(16).toString("hex")}`,
          userId: input.userId,
          bio: input.bio,
          location: input.location,
          avatarAssetId: input.avatarAssetId || null,
          bannerAssetId: input.bannerAssetId || null,
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl,
        },
      });

      await tx.profileSetting.upsert({
        where: { userId: input.userId },
        update: {},
        create: {
          id: `pset_${randomBytes(16).toString("hex")}`,
          userId: input.userId,
        },
      });

      await tx.profileLink.deleteMany({
        where: { userId: input.userId },
      });

      if (input.links.length > 0) {
        await tx.profileLink.createMany({
          data: input.links.map((link) => ({
            id: `plink_${randomBytes(16).toString("hex")}`,
            userId: input.userId,
            label: link.label,
            url: link.url,
          })),
        });
      }
    });

    return this.getProfileByUserId(input.userId);
  }
}

function sanitizeBio(value: string) {
  const bio = value.trim();
  if (bio.length > 280) {
    throw new Error("Bio must be 280 characters or fewer.");
  }

  return bio;
}

function sanitizeLocation(value: string) {
  const location = value.trim();
  if (location.length > 128) {
    throw new Error("Location must be 128 characters or fewer.");
  }

  return location;
}

function sanitizeAssetUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length > 255) {
    throw new Error(`${label} must be 255 characters or fewer.`);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} must be a valid http or https URL.`);
  }

  return trimmed;
}

function sanitizeAssetId(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.length > 64) {
    throw new Error(`${label} reference must be 64 characters or fewer.`);
  }

  if (!/^[a-z0-9_]+$/i.test(trimmed)) {
    throw new Error(`${label} reference contains invalid characters.`);
  }

  return trimmed;
}

function sanitizeLinks(
  links: {
    label?: string;
    url?: string;
  }[],
) {
  const normalized = links
    .map((link) => ({
      label: link.label?.trim() ?? "",
      url: link.url?.trim() ?? "",
    }))
    .filter((link) => link.label || link.url);

  if (normalized.length > 6) {
    throw new Error("Profile can publish at most 6 links.");
  }

  return normalized.map((link, index) => {
    if (!link.label || !link.url) {
      throw new Error(`Profile link ${index + 1} must include both a label and a URL.`);
    }

    if (link.label.length > 32) {
      throw new Error(`Profile link ${index + 1} label must be 32 characters or fewer.`);
    }

    return {
      label: link.label,
      url: sanitizeAssetUrl(link.url, `Profile link ${index + 1} URL`),
    };
  });
}
