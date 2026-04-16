import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type IdentityUser = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
};

type ListUsersResponse = {
  users: IdentityUser[];
};

type IdentityGrpcService = {
  listUsers(request: Record<string, never>): Observable<ListUsersResponse>;
};

@Injectable()
export class IdentityClientService implements OnModuleInit {
  private service!: IdentityGrpcService;

  constructor(@Inject("IDENTITY_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<IdentityGrpcService>("IdentityService");
  }

  async listUsers() {
    const response = await lastValueFrom(this.service.listUsers({}));
    return response.users ?? [];
  }
}
