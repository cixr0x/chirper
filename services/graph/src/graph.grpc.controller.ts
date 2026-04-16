import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { GraphService } from "./graph.service";

@Controller()
export class GraphGrpcController {
  constructor(@Inject(GraphService) private readonly graph: GraphService) {}

  @GrpcMethod("GraphService", "ListFollowing")
  async listFollowing(data: { userId: string }) {
    return {
      userIds: await this.graph.listFollowing(data.userId),
    };
  }

  @GrpcMethod("GraphService", "ListFollowers")
  async listFollowers(data: { userId: string }) {
    return {
      userIds: await this.graph.listFollowers(data.userId),
    };
  }

  @GrpcMethod("GraphService", "Follow")
  async follow(data: { followerUserId: string; followeeUserId: string }) {
    return this.graph.follow(data);
  }

  @GrpcMethod("GraphService", "Unfollow")
  async unfollow(data: { followerUserId: string; followeeUserId: string }) {
    return this.graph.unfollow(data);
  }
}
