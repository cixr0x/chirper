import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type ListFollowersRequest = { userId: string };
type ListFollowersResponse = { userIds: string[] };

type GraphGrpcService = {
  listFollowers(request: ListFollowersRequest): Observable<ListFollowersResponse>;
};

@Injectable()
export class GraphClientService implements OnModuleInit {
  private service!: GraphGrpcService;

  constructor(@Inject("GRAPH_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<GraphGrpcService>("GraphService");
  }

  async listFollowers(userId: string) {
    const response = await lastValueFrom(this.service.listFollowers({ userId }));
    return response.userIds ?? [];
  }
}
