import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DOMAIN_EVENTS,
  type GraphFollowCreatedPayload,
  type GraphFollowRemovedPayload,
} from "@chirper/contracts-events";
import { Prisma } from "../generated/prisma";
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

    const follow = await this.prisma.$transaction(async (tx) => {
      const existingFollow = await tx.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId: followerUserId,
            followeeId: followeeUserId,
          },
        },
      });

      if (existingFollow) {
        return existingFollow;
      }

      const createdFollow = await tx.follow.create({
        data: {
          id: `follow_${randomUUID().replace(/-/g, "")}`,
          followerId: followerUserId,
          followeeId: followeeUserId,
        },
      });

      const payload: GraphFollowCreatedPayload = {
        followId: createdFollow.id,
        followerUserId: createdFollow.followerId,
        followeeUserId: createdFollow.followeeId,
        createdAt: createdFollow.createdAt.toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: `outbox_${randomUUID().replace(/-/g, "")}`,
          aggregateType: "follow",
          aggregateId: createdFollow.id,
          eventType: DOMAIN_EVENTS.graphFollowCreated,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return createdFollow;
    });

    return {
      followId: follow.id,
      followerUserId: follow.followerId,
      followeeUserId: follow.followeeId,
      createdAt: follow.createdAt.toISOString(),
    };
  }

  async unfollow(input: { followerUserId: string; followeeUserId: string }) {
    const followerUserId = input.followerUserId.trim();
    const followeeUserId = input.followeeUserId.trim();
    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.follow.deleteMany({
        where: {
          followerId: followerUserId,
          followeeId: followeeUserId,
        },
      });

      if (deleted.count > 0) {
        const payload: GraphFollowRemovedPayload = {
          followerUserId,
          followeeUserId,
          removedAt: new Date().toISOString(),
        };

        await tx.outboxEvent.create({
          data: {
            id: `outbox_${randomUUID().replace(/-/g, "")}`,
            aggregateType: "follow",
            aggregateId: `${followerUserId}:${followeeUserId}`,
            eventType: DOMAIN_EVENTS.graphFollowRemoved,
            payload: payload as Prisma.InputJsonValue,
          },
        });
      }

      return deleted;
    });

    return {
      removed: result.count > 0,
    };
  }
}
