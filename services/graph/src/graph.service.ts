import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "./prisma.service";

type FollowRecord = {
  followId: string;
  followerUserId: string;
  followeeUserId: string;
  createdAt: string;
};

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async listFollowing(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      orderBy: [{ createdAt: "desc" }],
    });

    return follows.map((follow) => follow.followeeId);
  }

  async listFollowers(userId: string): Promise<string[]> {
    const follows = await this.prisma.follow.findMany({
      where: { followeeId: userId },
      orderBy: [{ createdAt: "desc" }],
    });

    return follows.map((follow) => follow.followerId);
  }

  async follow(input: {
    followerUserId: string;
    followeeUserId: string;
  }): Promise<FollowRecord> {
    const followerUserId = input.followerUserId.trim();
    const followeeUserId = input.followeeUserId.trim();

    if (!followerUserId || !followeeUserId) {
      throw new BadRequestException("Both followerUserId and followeeUserId are required.");
    }

    if (followerUserId === followeeUserId) {
      throw new BadRequestException("A user cannot follow themselves.");
    }

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followeeId: {
          followerId: followerUserId,
          followeeId: followeeUserId,
        },
      },
      update: {},
      create: {
        id: `follow_${randomUUID().replace(/-/g, "")}`,
        followerId: followerUserId,
        followeeId: followeeUserId,
      },
    });

    return {
      followId: follow.id,
      followerUserId: follow.followerId,
      followeeUserId: follow.followeeId,
      createdAt: follow.createdAt.toISOString(),
    };
  }

  async unfollow(input: { followerUserId: string; followeeUserId: string }) {
    const result = await this.prisma.follow.deleteMany({
      where: {
        followerId: input.followerUserId.trim(),
        followeeId: input.followeeUserId.trim(),
      },
    });

    return {
      removed: result.count > 0,
    };
  }
}
