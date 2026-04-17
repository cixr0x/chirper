import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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

type FollowPage = {
  userIds: string[];
  totalCount: number;
  nextCursor: string;
};

@Injectable()
export class GraphService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listFollowing(userId: string, limit = 0, cursor?: string): Promise<FollowPage> {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return { userIds: [], totalCount: 0, nextCursor: "" };
    }

    const totalCount = await this.prisma.follow.count({
      where: { followerId: normalizedUserId },
    });
    const normalizedLimit = normalizePageLimit(limit);
    const cursorMarker = decodeDateIdCursor(cursor);
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: normalizedUserId,
        ...(normalizedLimit > 0 && cursorMarker
          ? {
              OR: [
                { createdAt: { lt: cursorMarker.createdAt } },
                {
                  createdAt: cursorMarker.createdAt,
                  id: { lt: cursorMarker.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(normalizedLimit > 0 ? { take: normalizedLimit + 1 } : {}),
    });

    const pageRows = normalizedLimit > 0 ? follows.slice(0, normalizedLimit) : follows;
    const lastRow = pageRows.at(-1);
    return {
      userIds: pageRows.map((follow) => follow.followeeId),
      totalCount,
      nextCursor:
        normalizedLimit > 0 && follows.length > normalizedLimit && lastRow
          ? encodeDateIdCursor(lastRow.createdAt, lastRow.id)
          : "",
    };
  }

  async listFollowers(userId: string, limit = 0, cursor?: string): Promise<FollowPage> {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return { userIds: [], totalCount: 0, nextCursor: "" };
    }

    const totalCount = await this.prisma.follow.count({
      where: { followeeId: normalizedUserId },
    });
    const normalizedLimit = normalizePageLimit(limit);
    const cursorMarker = decodeDateIdCursor(cursor);
    const follows = await this.prisma.follow.findMany({
      where: {
        followeeId: normalizedUserId,
        ...(normalizedLimit > 0 && cursorMarker
          ? {
              OR: [
                { createdAt: { lt: cursorMarker.createdAt } },
                {
                  createdAt: cursorMarker.createdAt,
                  id: { lt: cursorMarker.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(normalizedLimit > 0 ? { take: normalizedLimit + 1 } : {}),
    });

    const pageRows = normalizedLimit > 0 ? follows.slice(0, normalizedLimit) : follows;
    const lastRow = pageRows.at(-1);
    return {
      userIds: pageRows.map((follow) => follow.followerId),
      totalCount,
      nextCursor:
        normalizedLimit > 0 && follows.length > normalizedLimit && lastRow
          ? encodeDateIdCursor(lastRow.createdAt, lastRow.id)
          : "",
    };
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

function normalizePageLimit(limit: number) {
  const normalized = Number(limit);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }

  return Math.min(Math.trunc(normalized), 100);
}

function encodeDateIdCursor(createdAt: Date, id: string) {
  return Buffer.from(
    JSON.stringify({
      createdAt: createdAt.toISOString(),
      id,
    }),
  ).toString("base64url");
}

function decodeDateIdCursor(cursor?: string) {
  const normalizedCursor = cursor?.trim();
  if (!normalizedCursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(normalizedCursor, "base64url").toString("utf8")) as {
      createdAt?: string;
      id?: string;
    };
    const createdAt = new Date(parsed.createdAt ?? "");
    if (!parsed.id || Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}
