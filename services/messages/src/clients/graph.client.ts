import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type HasBlockBetweenRequest = {
  userIdA: string;
  userIdB: string;
};

type HasBlockBetweenResponse = {
  blocked: boolean;
};

type GraphGrpcService = {
  hasBlockBetween(request: HasBlockBetweenRequest): Observable<HasBlockBetweenResponse>;
};

@Injectable()
export class GraphClientService implements OnModuleInit {
  private service!: GraphGrpcService;

  constructor(@Inject("GRAPH_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<GraphGrpcService>("GraphService");
  }

  async hasBlockBetween(userIdA: string, userIdB: string) {
    const response = await lastValueFrom(this.service.hasBlockBetween({ userIdA, userIdB }));
    return response.blocked;
  }
}
