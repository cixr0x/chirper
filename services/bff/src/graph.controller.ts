import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { GraphClientService } from "./clients/graph.client";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";

@Controller()
export class GraphController {
  constructor(
    @Inject(GraphClientService) private readonly graphClient: GraphClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
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
}
