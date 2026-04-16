import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { IdentityClientService, type IdentityUser } from "./clients/identity.client";
import {
  type PostMetrics,
  type PostRecord,
  PostsClientService,
  type TimelineActivityRecord,
} from "./clients/posts.client";
import { TimelineClientService } from "./clients/timeline.client";
import { ProfileClientService } from "./clients/profile.client";
import { buildManagedAssetUrl } from "./media-url";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";

type FeedActivity = {
  sourcePostId: string;
  actorUserId: string;
  activityType: string;
  insertedAt?: string;
};

type ThreadEnvelope = {
  focus: Awaited<ReturnType<FeedController["buildFeedItem"]>>;
  ancestors: Awaited<ReturnType<FeedController["buildFeed"]>>;
  replies: Awaited<ReturnType<FeedController["buildFeed"]>>;
};

@Controller()
export class FeedController {
  constructor(
    @Inject(PostsClientService) private readonly postsClient: PostsClientService,
    @Inject(IdentityClientService) private readonly identityClient: IdentityClientService,
    @Inject(ProfileClientService) private readonly profileClient: ProfileClientService,
    @Inject(TimelineClientService) private readonly timelineClient: TimelineClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
  ) {}

  @Get("feed")
  async getFeed(@Headers(sessionHeaderName) sessionToken?: string) {
    const session = await this.sessionAuth.optionalSession(sessionToken);
    if (session) {
      return this.buildHomeFeed(session.userId);
    }

    const posts = await this.postsClient.listPublicPosts(50);
    return this.buildFeed(posts);
  }

  @Get("users/:userId/feed")
  async getUserFeed(
    @Param("userId") userId: string,
    @Query("limit") limit?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.optionalSession(sessionToken);
    return this.buildUserFeed(userId, this.normalizeLimit(limit, 40), session?.userId);
  }

  @Get("posts/:postId/thread")
  async getThread(
    @Param("postId") postId: string,
    @Query("replyLimit") replyLimit?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ): Promise<ThreadEnvelope> {
    const session = await this.sessionAuth.optionalSession(sessionToken);
    return this.buildThread(postId, this.normalizeLimit(replyLimit, 40), session?.userId);
  }

  @Post("posts")
  async createPost(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      body: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const authorUserId = session.userId;
    const content = body.body.trim();
    if (!content) {
      throw new BadRequestException("Post body is required.");
    }

    const created = await this.postsClient.createPost({
      authorUserId,
      body: content,
      visibility: "public",
    });

    return this.buildFeedItem(created, authorUserId);
  }

  @Post("posts/:postId/replies")
  async createReply(
    @Param("postId") postId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      body: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const content = body.body.trim();
    if (!content) {
      throw new BadRequestException("Reply body is required.");
    }

    const created = await this.postsClient.createReply({
      authorUserId: session.userId,
      inReplyToPostId: postId,
      body: content,
      visibility: "public",
    });

    return this.buildFeedItem(created, session.userId);
  }

  @Post("posts/:postId/likes")
  async createLike(
    @Param("postId") postId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return this.postsClient.createLike({
      userId: session.userId,
      postId,
    });
  }

  @Post("posts/:postId/likes/remove")
  async removeLike(
    @Param("postId") postId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return this.postsClient.removeLike({
      userId: session.userId,
      postId,
    });
  }

  @Post("posts/:postId/reposts")
  async createRepost(
    @Param("postId") postId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return this.postsClient.createRepost({
      userId: session.userId,
      postId,
    });
  }

  @Post("posts/:postId/reposts/remove")
  async removeRepost(
    @Param("postId") postId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return this.postsClient.removeRepost({
      userId: session.userId,
      postId,
    });
  }

  private async buildHomeFeed(viewerUserId: string) {
    let entries = await this.timelineClient.listHomeTimeline(viewerUserId, 50);
    if (entries.length === 0) {
      entries = await this.timelineClient.rebuildHomeTimeline(viewerUserId, 50);
    }

    const posts = await this.postsClient.getPostsByIds(entries.map((entry) => entry.sourcePostId));
    return this.buildFeedItems(
      posts,
      entries.map((entry) => ({
        sourcePostId: entry.sourcePostId,
        actorUserId: entry.actorUserId,
        activityType: entry.activityType,
        insertedAt: entry.insertedAt,
      })),
      viewerUserId,
    );
  }

  private async buildUserFeed(userId: string, limit = 25, viewerUserId?: string) {
    const activities = await this.postsClient.listTimelineActivitiesByUsers([userId], limit);
    if (activities.length === 0) {
      return [];
    }

    const posts = await this.postsClient.getPostsByIds(activities.map((activity) => activity.sourcePostId));
    return this.buildFeedItems(posts, this.toActivities(activities), viewerUserId);
  }

  private async buildThread(postId: string, replyLimit = 25, viewerUserId?: string): Promise<ThreadEnvelope> {
    const [focus] = await this.postsClient.getPostsByIds([postId]);
    if (!focus) {
      throw new NotFoundException(`Post ${postId} was not found.`);
    }

    const [ancestors, replies] = await Promise.all([
      this.listAncestorPosts(focus),
      this.postsClient.listReplies(focus.postId, replyLimit),
    ]);

    const [focusItem, ancestorItems, replyItems] = await Promise.all([
      this.buildFeedItem(focus, viewerUserId),
      ancestors.length > 0 ? this.buildFeed(ancestors, viewerUserId) : Promise.resolve([]),
      replies.length > 0 ? this.buildFeed(replies, viewerUserId) : Promise.resolve([]),
    ]);

    return {
      focus: focusItem,
      ancestors: ancestorItems,
      replies: replyItems,
    };
  }

  private async buildFeedItem(created: {
    postId: string;
    authorUserId: string;
    body: string;
    visibility: string;
    createdAt: string;
    inReplyToPostId: string;
  }, viewerUserId?: string) {
    const items = await this.buildFeedItems(
      [created],
      [
        {
          sourcePostId: created.postId,
          actorUserId: created.authorUserId,
          activityType: created.inReplyToPostId ? "reply" : "post",
          insertedAt: created.createdAt,
        },
      ],
      viewerUserId,
    );

    return items[0] ?? null;
  }

  private async buildAuthorMap(authorUserIds: string[]) {
    const uniqueAuthorIds = [...new Set(authorUserIds)];
    const authors = await Promise.all(
      uniqueAuthorIds.map(async (authorUserId) => {
        const [identity, profile] = await Promise.all([
          this.identityClient.getUserById(authorUserId),
          this.profileClient.getProfileByUserId(authorUserId),
        ]);

        return [
          authorUserId,
          this.toActorSummary(identity, profile),
        ] as const;
      }),
    );

    return new Map(authors);
  }

  private async buildFeedItems(posts: PostRecord[], activities: FeedActivity[], viewerUserId?: string) {
    const postMap = new Map(posts.map((post) => [post.postId, post]));
    const metrics = await this.postsClient.getPostMetrics(
      posts.map((post) => post.postId),
      viewerUserId,
    );
    const metricsMap = new Map(metrics.map((metric) => [metric.postId, metric]));

    const parentPostIds = [
      ...new Set(posts.map((post) => post.inReplyToPostId).filter(Boolean)),
    ];
    const parentPosts = parentPostIds.length > 0 ? await this.postsClient.getPostsByIds(parentPostIds) : [];
    const parentPostMap = new Map(parentPosts.map((post) => [post.postId, post]));

    const authorIds = [
      ...new Set([
        ...posts.map((post) => post.authorUserId),
        ...activities.map((activity) => activity.actorUserId),
        ...parentPosts.map((post) => post.authorUserId),
      ]),
    ];
    const authorMap = await this.buildAuthorMap(authorIds);

    return activities
      .map((activity) => {
        const post = postMap.get(activity.sourcePostId);
        if (!post) {
          return null;
        }

        const parentPost = post.inReplyToPostId ? parentPostMap.get(post.inReplyToPostId) : undefined;
        return {
          postId: post.postId,
          body: post.body,
          visibility: post.visibility,
          createdAt: post.createdAt,
          projectedAt: activity.insertedAt,
          activityType: activity.activityType,
          author: authorMap.get(post.authorUserId),
          actor: activity.activityType === "repost" ? authorMap.get(activity.actorUserId) : undefined,
          inReplyTo: parentPost
            ? {
                postId: parentPost.postId,
                author: authorMap.get(parentPost.authorUserId),
              }
            : post.inReplyToPostId
              ? {
                  postId: post.inReplyToPostId,
                  author: undefined,
                }
              : undefined,
          metrics: metricsMap.get(post.postId) ?? this.emptyMetrics(post.postId),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  private async buildFeed(
    posts: PostRecord[],
    viewerUserId?: string,
  ) {
    return this.buildFeedItems(
      posts,
      posts.map((post) => ({
        sourcePostId: post.postId,
        actorUserId: post.authorUserId,
        activityType: post.inReplyToPostId ? "reply" : "post",
        insertedAt: post.createdAt,
      })),
      viewerUserId,
    );
  }

  private async listAncestorPosts(post: PostRecord) {
    const ancestors: PostRecord[] = [];
    const seenPostIds = new Set([post.postId]);
    let currentParentId = post.inReplyToPostId;

    while (currentParentId && !seenPostIds.has(currentParentId) && ancestors.length < 12) {
      seenPostIds.add(currentParentId);
      const [parent] = await this.postsClient.getPostsByIds([currentParentId]);
      if (!parent) {
        break;
      }

      ancestors.unshift(parent);
      currentParentId = parent.inReplyToPostId;
    }

    return ancestors;
  }

  private toActivities(activities: TimelineActivityRecord[]): FeedActivity[] {
    return activities.map((activity) => ({
      sourcePostId: activity.sourcePostId,
      actorUserId: activity.actorUserId,
      activityType: activity.activityType,
      insertedAt: activity.createdAt,
    }));
  }

  private normalizeLimit(value: string | undefined, fallback: number) {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), 100);
  }

  private toActorSummary(
    identity: IdentityUser,
    profile: {
      avatarAssetId: string;
      avatarUrl: string;
    },
  ) {
    return {
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      avatarUrl: profile.avatarAssetId ? buildManagedAssetUrl(profile.avatarAssetId) : profile.avatarUrl,
    };
  }

  private emptyMetrics(postId: string): PostMetrics {
    return {
      postId,
      replyCount: 0,
      likeCount: 0,
      repostCount: 0,
      likedByViewer: false,
      repostedByViewer: false,
    };
  }
}
