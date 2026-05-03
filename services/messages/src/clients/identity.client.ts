import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
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
    try {
      const response = await lastValueFrom(this.service.getUserById({ userId }));
      return response?.userId ? response : null;
    } catch (error) {
      if (isGrpcNotFound(error)) {
        return null;
      }
      throw error;
    }
  }
}

function isGrpcNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === status.NOT_FOUND;
}
