import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type ListFollowingRequest = { userId: string };
type ListFollowingResponse = { userIds: string[] };
type ListFollowersRequest = { userId: string };
type ListFollowersResponse = { userIds: string[] };

type GraphGrpcService = {
  listFollowing(request: ListFollowingRequest): Observable<ListFollowingResponse>;
  listFollowers(request: ListFollowersRequest): Observable<ListFollowersResponse>;
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

  async listFollowers(userId: string) {
    const response = await lastValueFrom(this.service.listFollowers({ userId }));
    return response.userIds ?? [];
  }
}
