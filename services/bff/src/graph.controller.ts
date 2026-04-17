import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { GraphClientService } from "./clients/graph.client";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";

type RelationshipUserSummary = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
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
  isViewer: boolean;
  isFollowedByViewer: boolean;
};

@Controller()
export class GraphController {
  constructor(
    @Inject(GraphClientService) private readonly graphClient: GraphClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
    @Inject(UserSummaryService) private readonly userSummaryService: UserSummaryService,
  ) {}

  @Get("graph/viewer/following")
  async listViewerFollowing(@Headers(sessionHeaderName) sessionToken?: string) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return {
      userIds: await this.graphClient.listFollowing(session.userId),
    };
  }

  @Get("graph/:userId/following")
  async listFollowing(@Param("userId") userId: string) {
    return {
      userIds: await this.graphClient.listFollowing(userId),
    };
  }

  @Get("users/:userId/followers")
  async listFollowerSummaries(
    @Param("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const followerPage = await this.graphClient.listFollowersPage(
      userId,
      this.normalizeLimit(limit, 12),
      cursor?.trim() || undefined,
    );
    return this.buildRelationshipSummaries(followerPage, sessionToken);
  }

  @Get("users/:userId/following")
  async listFollowingSummaries(
    @Param("userId") userId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const followingPage = await this.graphClient.listFollowingPage(
      userId,
      this.normalizeLimit(limit, 12),
      cursor?.trim() || undefined,
    );
    return this.buildRelationshipSummaries(followingPage, sessionToken);
  }

  @Post("follows")
  async follow(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      followeeUserId: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const followerUserId = session.userId;
    const follow = await this.graphClient.follow({
      followerUserId,
      followeeUserId: body.followeeUserId,
    });
    return follow;
  }

  @Post("follows/remove")
  async unfollow(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      followeeUserId: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const followerUserId = session.userId;
    const result = await this.graphClient.unfollow({
      followerUserId,
      followeeUserId: body.followeeUserId,
    });
    return result;
  }

  private async buildRelationshipSummaries(
    page: {
      userIds: string[];
      totalCount: number;
      nextCursor: string;
    },
    sessionToken?: string,
  ): Promise<{
    items: RelationshipUserSummary[];
    totalCount: number;
    nextCursor: string;
  }> {
    const session = await this.sessionAuth.optionalSession(sessionToken);
    const viewerFollowingIds = session ? await this.graphClient.listFollowing(session.userId) : [];
    const viewerFollowingSet = new Set(viewerFollowingIds);

    const items = await Promise.all(
      page.userIds.map(async (userId) => {
        const summary = await this.userSummaryService.getUserSummaryById(userId);
        return {
          ...summary,
          isViewer: session?.userId === userId,
          isFollowedByViewer: session ? viewerFollowingSet.has(userId) : false,
        };
      }),
    );

    return {
      items,
      totalCount: page.totalCount,
      nextCursor: page.nextCursor,
    };
  }

  private normalizeLimit(value: string | undefined, fallback: number) {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), 1), 100);
  }
}
