import { BadRequestException, Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
import { NotificationsClientService } from "./clients/notifications.client";
import { TimelineClientService } from "./clients/timeline.client";
import { PostsClientService } from "./clients/posts.client";
import { ProfileClientService } from "./clients/profile.client";
import { buildManagedAssetUrl } from "./media-url";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";

@Controller()
export class FeedController {
  constructor(
    private readonly postsClient: PostsClientService,
    private readonly graphClient: GraphClientService,
    private readonly identityClient: IdentityClientService,
    private readonly profileClient: ProfileClientService,
    private readonly timelineClient: TimelineClientService,
    private readonly notificationsClient: NotificationsClientService,
    private readonly sessionAuth: SessionAuthService,
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

    const followerUserIds = await this.graphClient.listFollowers(created.authorUserId);
    await Promise.allSettled(
      followerUserIds.map((recipientUserId) =>
        this.notificationsClient.createNotification({
          recipientUserId,
          actorUserId: created.authorUserId,
          type: "new_post",
          resourceId: created.postId,
        }),
      ),
    );

    return this.buildFeedItem(created);
  }

  private async buildHomeFeed(viewerUserId: string) {
    let entries = await this.timelineClient.listHomeTimeline(viewerUserId, 50);
    if (entries.length === 0) {
      entries = await this.timelineClient.rebuildHomeTimeline(viewerUserId, 50);
    }

    const posts = await this.postsClient.getPostsByIds(entries.map((entry) => entry.sourcePostId));
    const postMap = new Map(posts.map((post) => [post.postId, post]));
    const authorMap = await this.buildAuthorMap(entries.map((entry) => entry.actorUserId));

    return entries
      .map((entry) => {
        const post = postMap.get(entry.sourcePostId);
        if (!post) {
          return null;
        }

        return {
          postId: post.postId,
          body: post.body,
          visibility: post.visibility,
          createdAt: post.createdAt,
          projectedAt: entry.insertedAt,
          author: authorMap.get(entry.actorUserId),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  private async buildFeedItem(created: {
    postId: string;
    authorUserId: string;
    body: string;
    visibility: string;
    createdAt: string;
  }) {
    const [identity, profile] = await Promise.all([
      this.identityClient.getUserById(created.authorUserId),
      this.profileClient.getProfileByUserId(created.authorUserId),
    ]);

    return {
      postId: created.postId,
      body: created.body,
      visibility: created.visibility,
      createdAt: created.createdAt,
      author: {
        userId: identity.userId,
        handle: identity.handle,
        displayName: identity.displayName,
        avatarUrl: profile.avatarAssetId ? buildManagedAssetUrl(profile.avatarAssetId) : profile.avatarUrl,
      },
    };
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
          {
            userId: identity.userId,
            handle: identity.handle,
            displayName: identity.displayName,
            avatarUrl: profile.avatarAssetId ? buildManagedAssetUrl(profile.avatarAssetId) : profile.avatarUrl,
          },
        ] as const;
      }),
    );

    return new Map(authors);
  }

  private async buildFeed(
    posts: {
      postId: string;
      authorUserId: string;
      body: string;
      visibility: string;
      createdAt: string;
    }[],
  ) {
    const authorMap = await this.buildAuthorMap(posts.map((post) => post.authorUserId));

    return posts.map((post) => ({
      postId: post.postId,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt,
      author: authorMap.get(post.authorUserId),
    }));
  }
}
