import { Injectable } from "@nestjs/common";
import {
  DOMAIN_EVENTS,
  type GraphFollowCreatedEvent,
  type GraphFollowRemovedEvent,
  type PostPublishedEvent,
} from "@chirper/contracts-events";
import { Prisma } from "../generated/prisma";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
import { PostRecord, PostsClientService } from "./clients/posts.client";
import { PrismaService } from "./prisma.service";

type TimelineEntry = {
  entryId: string;
  ownerUserId: string;
  sourcePostId: string;
  actorUserId: string;
  insertedAt: string;
  rankScore: number;
};

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityClient: IdentityClientService,
    private readonly graphClient: GraphClientService,
    private readonly postsClient: PostsClientService,
  ) {}

  async listHomeTimeline(ownerUserId: string, limit = 25): Promise<TimelineEntry[]> {
    const entries = await this.prisma.homeEntry.findMany({
      where: { ownerUserId },
      orderBy: [{ rankScore: "desc" }, { insertedAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return entries.map((entry) => this.mapEntry(entry));
  }

  async rebuildHomeTimeline(ownerUserId: string, limit = 25): Promise<TimelineEntry[]> {
    const followingUserIds = await this.listProjectedFollowing(ownerUserId);
    const authorUserIds = [...new Set([ownerUserId, ...followingUserIds])];
    const posts = await this.postsClient.listPostsByAuthors(authorUserIds, limit);

    const homeEntries = posts.map((post) => this.toHomeEntry(ownerUserId, post));
    const userEntries = posts
      .filter((post) => post.authorUserId === ownerUserId)
      .map((post) => this.toUserEntry(ownerUserId, post));

    await this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.homeEntry.deleteMany({
          where: { ownerUserId },
        });

        if (homeEntries.length > 0) {
          await tx.homeEntry.createMany({
            data: homeEntries,
            skipDuplicates: true,
          });
        }

        await tx.userEntry.deleteMany({
          where: { ownerUserId },
        });

        if (userEntries.length > 0) {
          await tx.userEntry.createMany({
            data: userEntries,
            skipDuplicates: true,
          });
        }

        await tx.rankState.upsert({
          where: { ownerUserId },
          update: {
            cursor: posts[0]?.postId ?? null,
          },
          create: {
            id: `rank_${ownerUserId}`,
            ownerUserId,
            cursor: posts[0]?.postId ?? null,
          },
        });
      }),
    );

    return this.listHomeTimeline(ownerUserId, limit);
  }

  async fanOutPost(input: {
    postId: string;
    authorUserId: string;
    createdAt: string;
  }) {
    return this.projectPublishedPost({
      postId: input.postId,
      authorUserId: input.authorUserId,
      createdAt: input.createdAt,
    });
  }

  async consumePostPublishedEvent(event: PostPublishedEvent) {
    return this.projectPublishedPost(
      {
        postId: event.payload.postId,
        authorUserId: event.payload.authorUserId,
        createdAt: event.payload.createdAt,
      },
      event,
    );
  }

  async consumeGraphFollowCreatedEvent(event: GraphFollowCreatedEvent) {
    return this.rebuildFromGraphEvent(event, event.payload.followerUserId);
  }

  async consumeGraphFollowRemovedEvent(event: GraphFollowRemovedEvent) {
    return this.rebuildFromGraphEvent(event, event.payload.followerUserId);
  }

  async rebuildFollowProjection() {
    const users = await this.identityClient.listUsers();
    const followEdges: Prisma.FollowEdgeCreateManyInput[] = [];

    for (const user of users) {
      const followeeUserIds = await this.graphClient.listFollowing(user.userId);
      for (const followeeUserId of followeeUserIds) {
        followEdges.push({
          id: this.followEdgeId(user.userId, followeeUserId),
          ownerUserId: user.userId,
          followeeUserId,
        });
      }
    }

    await this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        await tx.followEdge.deleteMany({});

        if (followEdges.length > 0) {
          await tx.followEdge.createMany({
            data: followEdges,
            skipDuplicates: true,
          });
        }
      }),
    );

    let rebuiltTimelineCount = 0;
    for (const user of users) {
      const entries = await this.rebuildHomeTimeline(user.userId, 50);
      rebuiltTimelineCount += entries.length;
    }

    return {
      userCount: users.length,
      followEdgeCount: followEdges.length,
      rebuiltTimelineCount,
    };
  }

  private async projectPublishedPost(
    input: {
      postId: string;
      authorUserId: string;
      createdAt: string;
    },
    event?: PostPublishedEvent,
  ) {
    const createdAt = this.parseDate(input.createdAt);
    const rankScore = this.rankScoreFor(createdAt);
    const followerUserIds = await this.listProjectedFollowers(input.authorUserId);
    const ownerUserIds = [...new Set([input.authorUserId, ...followerUserIds])];

    await this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        if (event) {
          const existingInboxEvent = await tx.inboxEvent.findUnique({
            where: { id: event.id },
          });

          if (existingInboxEvent?.processedAt) {
            return;
          }

          await tx.inboxEvent.upsert({
            where: { id: event.id },
            update: {
              eventType: event.name,
              payload: event as Prisma.InputJsonValue,
            },
            create: {
              id: event.id,
              eventType: event.name,
              payload: event as Prisma.InputJsonValue,
            },
          });
        }

        if (ownerUserIds.length > 0) {
          await tx.homeEntry.createMany({
            data: ownerUserIds.map((ownerUserId) => ({
              id: this.homeEntryId(ownerUserId, input.postId),
              ownerUserId,
              sourcePostId: input.postId,
              actorUserId: input.authorUserId,
              insertedAt: createdAt,
              rankScore,
            })),
            skipDuplicates: true,
          });
        }

        await tx.userEntry.createMany({
          data: [
            {
              id: this.userEntryId(input.authorUserId, input.postId),
              ownerUserId: input.authorUserId,
              sourcePostId: input.postId,
              insertedAt: createdAt,
            },
          ],
          skipDuplicates: true,
        });

        if (event) {
          await tx.inboxEvent.update({
            where: { id: event.id },
            data: {
              eventType: DOMAIN_EVENTS.postPublished,
              processedAt: new Date(),
            },
          });
        }
      }),
    );

    return {
      insertedCount: ownerUserIds.length,
    };
  }

  private async rebuildFromGraphEvent(
    event: GraphFollowCreatedEvent | GraphFollowRemovedEvent,
    ownerUserId: string,
  ) {
    const eventReserved = await this.reserveInboxEvent(event);
    if (!eventReserved) {
      return {
        rebuilt: false,
      };
    }

    if (event.name === DOMAIN_EVENTS.graphFollowCreated) {
      await this.prisma.followEdge.upsert({
        where: {
          ownerUserId_followeeUserId: {
            ownerUserId: event.payload.followerUserId,
            followeeUserId: event.payload.followeeUserId,
          },
        },
        update: {},
        create: {
          id: this.followEdgeId(event.payload.followerUserId, event.payload.followeeUserId),
          ownerUserId: event.payload.followerUserId,
          followeeUserId: event.payload.followeeUserId,
        },
      });
    }

    if (event.name === DOMAIN_EVENTS.graphFollowRemoved) {
      await this.prisma.followEdge.deleteMany({
        where: {
          ownerUserId: event.payload.followerUserId,
          followeeUserId: event.payload.followeeUserId,
        },
      });
    }

    const entries = await this.rebuildHomeTimeline(ownerUserId, 50);
    await this.markInboxProcessed(event.id, event.name);

    return {
      rebuilt: true,
      entryCount: entries.length,
    };
  }

  private toHomeEntry(ownerUserId: string, post: PostRecord) {
    const insertedAt = this.parseDate(post.createdAt);
    return {
      id: this.homeEntryId(ownerUserId, post.postId),
      ownerUserId,
      sourcePostId: post.postId,
      actorUserId: post.authorUserId,
      insertedAt,
      rankScore: this.rankScoreFor(insertedAt),
    };
  }

  private toUserEntry(ownerUserId: string, post: PostRecord) {
    return {
      id: this.userEntryId(ownerUserId, post.postId),
      ownerUserId,
      sourcePostId: post.postId,
      insertedAt: this.parseDate(post.createdAt),
    };
  }

  private mapEntry(entry: {
    id: string;
    ownerUserId: string;
    sourcePostId: string;
    actorUserId: string;
    insertedAt: Date;
    rankScore: { toNumber(): number };
  }): TimelineEntry {
    return {
      entryId: entry.id,
      ownerUserId: entry.ownerUserId,
      sourcePostId: entry.sourcePostId,
      actorUserId: entry.actorUserId,
      insertedAt: entry.insertedAt.toISOString(),
      rankScore: entry.rankScore.toNumber(),
    };
  }

  private parseDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private rankScoreFor(date: Date) {
    return Number((date.getTime() / 1000).toFixed(4));
  }

  private homeEntryId(ownerUserId: string, postId: string) {
    return `home_${ownerUserId}_${postId}`;
  }

  private userEntryId(ownerUserId: string, postId: string) {
    return `user_${ownerUserId}_${postId}`;
  }

  private followEdgeId(ownerUserId: string, followeeUserId: string) {
    return `follow_${ownerUserId}_${followeeUserId}`;
  }

  private async listProjectedFollowing(ownerUserId: string) {
    const edges = await this.prisma.followEdge.findMany({
      where: { ownerUserId },
      orderBy: [{ createdAt: "desc" }],
    });

    return edges.map((edge) => edge.followeeUserId);
  }

  private async listProjectedFollowers(followeeUserId: string) {
    const edges = await this.prisma.followEdge.findMany({
      where: { followeeUserId },
      orderBy: [{ createdAt: "desc" }],
    });

    return edges.map((edge) => edge.ownerUserId);
  }

  private async reserveInboxEvent(
    event: PostPublishedEvent | GraphFollowCreatedEvent | GraphFollowRemovedEvent,
  ) {
    const existingInboxEvent = await this.prisma.inboxEvent.findUnique({
      where: { id: event.id },
    });

    if (existingInboxEvent?.processedAt) {
      return false;
    }

    await this.prisma.inboxEvent.upsert({
      where: { id: event.id },
      update: {
        eventType: event.name,
        payload: event as Prisma.InputJsonValue,
      },
      create: {
        id: event.id,
        eventType: event.name,
        payload: event as Prisma.InputJsonValue,
      },
    });

    return true;
  }

  private async markInboxProcessed(id: string, eventType: string) {
    await this.prisma.inboxEvent.update({
      where: { id },
      data: {
        eventType,
        processedAt: new Date(),
      },
    });
  }

  private async runWithRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isRetryableWriteConflict(error) || attempt === retries - 1) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  private isRetryableWriteConflict(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2034"
    );
  }
}
