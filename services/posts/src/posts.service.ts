import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  DOMAIN_EVENTS,
  type PostLikeCreatedPayload,
  type PostLikeRemovedPayload,
  type PostPublishedPayload,
  type PostRepostCreatedPayload,
  type PostRepostRemovedPayload,
} from "@chirper/contracts-events";
import { Prisma } from "../generated/prisma";
import { PrismaService } from "./prisma.service";

type PostRecord = {
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: string;
  inReplyToPostId: string;
};

type PostInteractionRecord = {
  interactionId: string;
  postId: string;
  userId: string;
  createdAt: string;
  changed: boolean;
};

type PostInteractionRemovalResult = {
  removed: boolean;
};

type PostMetricsRecord = {
  postId: string;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};

type TimelineActivityRecord = {
  activityId: string;
  activityType: string;
  actorUserId: string;
  sourcePostId: string;
  createdAt: string;
};

@Injectable()
export class PostsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPublicPosts(limit = 25): Promise<PostRecord[]> {
    const posts = await this.prisma.post.findMany({
      where: { visibility: "public" },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return posts.map((post) => this.mapPost(post));
  }

  async listPostsByAuthors(authorUserIds: string[], limit = 25): Promise<PostRecord[]> {
    const uniqueAuthorIds = [...new Set(authorUserIds.map((value) => value.trim()).filter(Boolean))];
    if (uniqueAuthorIds.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: uniqueAuthorIds },
        visibility: "public",
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return posts.map((post) => this.mapPost(post));
  }

  async listReplies(postId: string, limit = 25): Promise<PostRecord[]> {
    const normalizedPostId = postId.trim();
    if (!normalizedPostId) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        inReplyToPostId: normalizedPostId,
        visibility: "public",
      },
      orderBy: [{ createdAt: "asc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return posts.map((post) => this.mapPost(post));
  }

  async listTimelineActivitiesByUsers(actorUserIds: string[], limit = 25): Promise<TimelineActivityRecord[]> {
    const uniqueActorIds = [...new Set(actorUserIds.map((value) => value.trim()).filter(Boolean))];
    if (uniqueActorIds.length === 0) {
      return [];
    }

    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const [posts, reposts] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          authorId: { in: uniqueActorIds },
          visibility: "public",
        },
        orderBy: [{ createdAt: "desc" }],
        take: normalizedLimit,
      }),
      this.prisma.repost.findMany({
        where: {
          userId: { in: uniqueActorIds },
        },
        orderBy: [{ createdAt: "desc" }],
        take: normalizedLimit,
      }),
    ]);

    const repostedPosts = await this.prisma.post.findMany({
      where: {
        id: { in: reposts.map((repost) => repost.postId) },
        visibility: "public",
      },
    });
    const repostedPostIds = new Set(repostedPosts.map((post) => post.id));

    const activities = [
      ...posts.map((post) => ({
        activityId: post.id,
        activityType: post.inReplyToPostId ? "reply" : "post",
        actorUserId: post.authorId,
        sourcePostId: post.id,
        createdAt: post.createdAt.toISOString(),
      })),
      ...reposts
        .filter((repost) => repostedPostIds.has(repost.postId))
        .map((repost) => ({
          activityId: repost.id,
          activityType: "repost",
          actorUserId: repost.userId,
          sourcePostId: repost.postId,
          createdAt: repost.createdAt.toISOString(),
        })),
    ];

    return activities
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, normalizedLimit);
  }

  async getPostsByIds(postIds: string[]): Promise<PostRecord[]> {
    const uniquePostIds = [...new Set(postIds.map((value) => value.trim()).filter(Boolean))];
    if (uniquePostIds.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: uniquePostIds },
      },
    });

    const postMap = new Map(
      posts.map((post) => [
        post.id,
        this.mapPost(post),
      ]),
    );

    return uniquePostIds.map((postId) => postMap.get(postId)).filter((post): post is PostRecord => Boolean(post));
  }

  async getPostMetrics(postIds: string[], viewerUserId?: string): Promise<PostMetricsRecord[]> {
    const uniquePostIds = [...new Set(postIds.map((value) => value.trim()).filter(Boolean))];
    if (uniquePostIds.length === 0) {
      return [];
    }

    const [replyCounts, likeCounts, repostCounts, viewerLikes, viewerReposts] = await Promise.all([
      this.prisma.post.groupBy({
        by: ["inReplyToPostId"],
        where: {
          inReplyToPostId: { in: uniquePostIds },
          visibility: "public",
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.like.groupBy({
        by: ["postId"],
        where: {
          postId: { in: uniquePostIds },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.repost.groupBy({
        by: ["postId"],
        where: {
          postId: { in: uniquePostIds },
        },
        _count: {
          _all: true,
        },
      }),
      viewerUserId
        ? this.prisma.like.findMany({
            where: {
              userId: viewerUserId,
              postId: { in: uniquePostIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),
      viewerUserId
        ? this.prisma.repost.findMany({
            where: {
              userId: viewerUserId,
              postId: { in: uniquePostIds },
            },
            select: { postId: true },
          })
        : Promise.resolve([]),
    ]);

    const replyCountMap = new Map(
      replyCounts
        .filter((row) => typeof row.inReplyToPostId === "string")
        .map((row) => [row.inReplyToPostId as string, row._count._all]),
    );
    const likeCountMap = new Map(likeCounts.map((row) => [row.postId, row._count._all]));
    const repostCountMap = new Map(repostCounts.map((row) => [row.postId, row._count._all]));
    const viewerLikedPostIds = new Set(viewerLikes.map((row) => row.postId));
    const viewerRepostedPostIds = new Set(viewerReposts.map((row) => row.postId));

    return uniquePostIds.map((postId) => ({
      postId,
      replyCount: replyCountMap.get(postId) ?? 0,
      likeCount: likeCountMap.get(postId) ?? 0,
      repostCount: repostCountMap.get(postId) ?? 0,
      likedByViewer: viewerLikedPostIds.has(postId),
      repostedByViewer: viewerRepostedPostIds.has(postId),
    }));
  }

  async createPost(input: {
    authorUserId: string;
    body: string;
    visibility?: string;
  }): Promise<PostRecord> {
    return this.createPostInternal({
      authorUserId: input.authorUserId,
      body: input.body,
      ...(input.visibility ? { visibility: input.visibility } : {}),
    });
  }

  async createReply(input: {
    authorUserId: string;
    inReplyToPostId: string;
    body: string;
    visibility?: string;
  }): Promise<PostRecord> {
    const parentPost = await this.requirePost(input.inReplyToPostId, "Cannot reply to a missing post.");

    return this.createPostInternal({
      authorUserId: input.authorUserId,
      body: input.body,
      ...(input.visibility ? { visibility: input.visibility } : {}),
      inReplyToPostId: parentPost.id,
      inReplyToAuthorUserId: parentPost.authorId,
    });
  }

  async createLike(input: { userId: string; postId: string }): Promise<PostInteractionRecord> {
    const userId = input.userId.trim();
    const postId = input.postId.trim();
    const post = await this.requirePost(postId, "Cannot like a missing post.");

    const like = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (existingLike) {
        return {
          interactionId: existingLike.id,
          postId: existingLike.postId,
          userId: existingLike.userId,
          createdAt: existingLike.createdAt.toISOString(),
          changed: false,
        } satisfies PostInteractionRecord;
      }

      const createdLike = await tx.like.create({
        data: {
          id: newId("like"),
          postId,
          userId,
        },
      });

      const payload: PostLikeCreatedPayload = {
        likeId: createdLike.id,
        postId: createdLike.postId,
        actorUserId: createdLike.userId,
        postAuthorUserId: post.authorId,
        createdAt: createdLike.createdAt.toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: newId("outbox"),
          aggregateType: "like",
          aggregateId: createdLike.id,
          eventType: DOMAIN_EVENTS.postLikeCreated,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return {
        interactionId: createdLike.id,
        postId: createdLike.postId,
        userId: createdLike.userId,
        createdAt: createdLike.createdAt.toISOString(),
        changed: true,
      } satisfies PostInteractionRecord;
    });

    return like;
  }

  async removeLike(input: { userId: string; postId: string }): Promise<PostInteractionRemovalResult> {
    const userId = input.userId.trim();
    const postId = input.postId.trim();
    const post = await this.requirePost(postId, "Cannot unlike a missing post.");

    return this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (!existingLike) {
        return { removed: false };
      }

      await tx.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      const payload: PostLikeRemovedPayload = {
        likeId: existingLike.id,
        postId: existingLike.postId,
        actorUserId: existingLike.userId,
        postAuthorUserId: post.authorId,
        removedAt: new Date().toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: newId("outbox"),
          aggregateType: "like",
          aggregateId: existingLike.id,
          eventType: DOMAIN_EVENTS.postLikeRemoved,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return { removed: true };
    });
  }

  async createRepost(input: { userId: string; postId: string }): Promise<PostInteractionRecord> {
    const userId = input.userId.trim();
    const postId = input.postId.trim();
    const post = await this.requirePost(postId, "Cannot repost a missing post.");

    if (post.authorId === userId) {
      throw new BadRequestException("You cannot repost your own post.");
    }

    const repost = await this.prisma.$transaction(async (tx) => {
      const existingRepost = await tx.repost.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (existingRepost) {
        return {
          interactionId: existingRepost.id,
          postId: existingRepost.postId,
          userId: existingRepost.userId,
          createdAt: existingRepost.createdAt.toISOString(),
          changed: false,
        } satisfies PostInteractionRecord;
      }

      const createdRepost = await tx.repost.create({
        data: {
          id: newId("repost"),
          postId,
          userId,
        },
      });

      const payload: PostRepostCreatedPayload = {
        repostId: createdRepost.id,
        postId: createdRepost.postId,
        actorUserId: createdRepost.userId,
        postAuthorUserId: post.authorId,
        createdAt: createdRepost.createdAt.toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: newId("outbox"),
          aggregateType: "repost",
          aggregateId: createdRepost.id,
          eventType: DOMAIN_EVENTS.postRepostCreated,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return {
        interactionId: createdRepost.id,
        postId: createdRepost.postId,
        userId: createdRepost.userId,
        createdAt: createdRepost.createdAt.toISOString(),
        changed: true,
      } satisfies PostInteractionRecord;
    });

    return repost;
  }

  async removeRepost(input: { userId: string; postId: string }): Promise<PostInteractionRemovalResult> {
    const userId = input.userId.trim();
    const postId = input.postId.trim();
    const post = await this.requirePost(postId, "Cannot undo a repost for a missing post.");

    return this.prisma.$transaction(async (tx) => {
      const existingRepost = await tx.repost.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      if (!existingRepost) {
        return { removed: false };
      }

      await tx.repost.delete({
        where: {
          id: existingRepost.id,
        },
      });

      const payload: PostRepostRemovedPayload = {
        repostId: existingRepost.id,
        postId: existingRepost.postId,
        actorUserId: existingRepost.userId,
        postAuthorUserId: post.authorId,
        removedAt: new Date().toISOString(),
      };

      await tx.outboxEvent.create({
        data: {
          id: newId("outbox"),
          aggregateType: "repost",
          aggregateId: existingRepost.id,
          eventType: DOMAIN_EVENTS.postRepostRemoved,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return { removed: true };
    });
  }

  private async createPostInternal(input: {
    authorUserId: string;
    body: string;
    visibility?: string;
    inReplyToPostId?: string;
    inReplyToAuthorUserId?: string;
  }): Promise<PostRecord> {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException("Post body cannot be empty.");
    }

    if (body.length > 280) {
      throw new BadRequestException("Post body cannot exceed 280 characters.");
    }

    const visibility = input.visibility?.trim() || "public";
    const post = await this.prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          id: newId("post"),
          authorId: input.authorUserId,
          inReplyToPostId: input.inReplyToPostId?.trim() || null,
          body,
          visibility,
        },
      });

      const payload: PostPublishedPayload = {
        postId: createdPost.id,
        authorUserId: createdPost.authorId,
        visibility: createdPost.visibility,
        createdAt: createdPost.createdAt.toISOString(),
        ...(createdPost.inReplyToPostId ? { inReplyToPostId: createdPost.inReplyToPostId } : {}),
        ...(input.inReplyToAuthorUserId?.trim()
          ? { inReplyToAuthorUserId: input.inReplyToAuthorUserId.trim() }
          : {}),
      };

      await tx.outboxEvent.create({
        data: {
          id: newId("outbox"),
          aggregateType: "post",
          aggregateId: createdPost.id,
          eventType: DOMAIN_EVENTS.postPublished,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      return createdPost;
    });

    return this.mapPost(post);
  }

  private async requirePost(postId: string, message: string) {
    const normalizedPostId = postId.trim();
    if (!normalizedPostId) {
      throw new BadRequestException(message);
    }

    const post = await this.prisma.post.findUnique({
      where: { id: normalizedPostId },
    });

    if (!post) {
      throw new BadRequestException(message);
    }

    return post;
  }

  private mapPost(post: {
    id: string;
    authorId: string;
    inReplyToPostId: string | null;
    body: string;
    visibility: string;
    createdAt: Date;
  }): PostRecord {
    return {
      postId: post.id,
      authorUserId: post.authorId,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt.toISOString(),
      inReplyToPostId: post.inReplyToPostId ?? "",
    };
  }
}

function newId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}
