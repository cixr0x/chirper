import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type ListFollowingRequest = { userId: string; limit?: number; cursor?: string };
type ListFollowingResponse = { userIds: string[]; totalCount?: number; nextCursor?: string };
type ListFollowersRequest = { userId: string; limit?: number; cursor?: string };
type ListFollowersResponse = { userIds: string[]; totalCount?: number; nextCursor?: string };
type FollowRequest = {
  followerUserId: string;
  followeeUserId: string;
};
type FollowRecord = {
  followId: string;
  followerUserId: string;
  followeeUserId: string;
  createdAt: string;
};
type UnfollowRequest = {
  followerUserId: string;
  followeeUserId: string;
};
type UnfollowResponse = {
  removed: boolean;
};

type GraphGrpcService = {
  listFollowing(request: ListFollowingRequest): Observable<ListFollowingResponse>;
  listFollowers(request: ListFollowersRequest): Observable<ListFollowersResponse>;
  follow(request: FollowRequest): Observable<FollowRecord>;
  unfollow(request: UnfollowRequest): Observable<UnfollowResponse>;
};

@Injectable()
export class GraphClientService implements OnModuleInit {
  private service!: GraphGrpcService;

  constructor(@Inject("GRAPH_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<GraphGrpcService>("GraphService");
  }

  async listFollowing(userId: string) {
    const response = await lastValueFrom(this.service.listFollowing({ userId }));
    return response.userIds ?? [];
  }

  async listFollowingPage(userId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listFollowing({
        userId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      userIds: response.userIds ?? [],
      totalCount: response.totalCount ?? 0,
      nextCursor: response.nextCursor ?? "",
    };
  }

  async listFollowers(userId: string) {
    const response = await lastValueFrom(this.service.listFollowers({ userId }));
    return response.userIds ?? [];
  }

  async listFollowersPage(userId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listFollowers({
        userId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      userIds: response.userIds ?? [],
      totalCount: response.totalCount ?? 0,
      nextCursor: response.nextCursor ?? "",
    };
  }

  follow(request: FollowRequest) {
    return lastValueFrom(this.service.follow(request));
  }

  unfollow(request: UnfollowRequest) {
    return lastValueFrom(this.service.unfollow(request));
  }
}
