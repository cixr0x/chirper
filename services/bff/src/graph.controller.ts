import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
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
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const followerIds = await this.graphClient.listFollowers(userId);
    return this.buildRelationshipSummaries(followerIds, sessionToken);
  }

  @Get("users/:userId/following")
  async listFollowingSummaries(
    @Param("userId") userId: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const followingIds = await this.graphClient.listFollowing(userId);
    return this.buildRelationshipSummaries(followingIds, sessionToken);
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
    userIds: string[],
    sessionToken?: string,
  ): Promise<RelationshipUserSummary[]> {
    const session = await this.sessionAuth.optionalSession(sessionToken);
    const viewerFollowingIds = session ? await this.graphClient.listFollowing(session.userId) : [];
    const viewerFollowingSet = new Set(viewerFollowingIds);

    return Promise.all(
      userIds.map(async (userId) => {
        const summary = await this.userSummaryService.getUserSummaryById(userId);
        return {
          ...summary,
          isViewer: session?.userId === userId,
          isFollowedByViewer: session ? viewerFollowingSet.has(userId) : false,
        };
      }),
    );
  }
}
