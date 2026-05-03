import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type IdentityUser = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
};

type GetUserByIdRequest = {
  userId: string;
};

type IdentityGrpcService = {
  getUserById(request: GetUserByIdRequest): Observable<IdentityUser>;
};

@Injectable()
export class IdentityClientService implements OnModuleInit {
  private service!: IdentityGrpcService;

  constructor(@Inject("IDENTITY_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<IdentityGrpcService>("IdentityService");
  }

  async getUserById(userId: string) {
    const response = await lastValueFrom(this.service.getUserById({ userId }));
    return response?.userId ? response : null;
  }
}
