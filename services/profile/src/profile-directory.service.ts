import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "./prisma.service";

type UserProfile = {
  userId: string;
  bio: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  links: {
    label: string;
    url: string;
  }[];
};

@Injectable()
export class ProfileDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(input: {
    userId: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<UserProfile> {
    const userId = input.userId.trim();
    const bio = input.bio?.trim() ?? "";
    const location = input.location?.trim() ?? "";
    const avatarUrl = input.avatarUrl?.trim() ?? "";
    const bannerUrl = input.bannerUrl?.trim() ?? "";

    return this.upsertProfile({
      userId,
      bio,
      location,
      avatarUrl,
      bannerUrl,
    });
  }

  async updateProfile(input: {
    userId: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }): Promise<UserProfile> {
    const userId = input.userId.trim();
    const bio = sanitizeBio(input.bio ?? "");
    const location = sanitizeLocation(input.location ?? "");
    const avatarUrl = sanitizeAssetUrl(input.avatarUrl ?? "", "Avatar URL");
    const bannerUrl = sanitizeAssetUrl(input.bannerUrl ?? "", "Banner URL");

    return this.upsertProfile({
      userId,
      bio,
      location,
      avatarUrl,
      bannerUrl,
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
        avatarUrl: "",
        bannerUrl: "",
        links: [],
      };
    }

    return {
      userId,
      bio: profile.bio ?? "",
      location: profile.location ?? "",
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
    avatarUrl: string;
    bannerUrl: string;
  }) {
    await this.prisma.$transaction([
      this.prisma.profile.upsert({
        where: { userId: input.userId },
        update: {
          bio: input.bio,
          location: input.location,
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl,
        },
        create: {
          id: `profile_${randomBytes(16).toString("hex")}`,
          userId: input.userId,
          bio: input.bio,
          location: input.location,
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl,
        },
      }),
      this.prisma.profileSetting.upsert({
        where: { userId: input.userId },
        update: {},
        create: {
          id: `pset_${randomBytes(16).toString("hex")}`,
          userId: input.userId,
        },
      }),
    ]);

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
