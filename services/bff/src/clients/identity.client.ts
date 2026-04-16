import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type GetUserByIdRequest = { userId: string };
type GetUserByHandleRequest = { handle: string };
type CreateSessionRequest = { userId: string; userAgent?: string };
type CreatePasswordSessionRequest = { handle: string; password: string; userAgent?: string };
type RegisterPasswordUserRequest = {
  handle: string;
  displayName: string;
  password: string;
  userAgent?: string;
};
type ChangePasswordRequest = { userId: string; currentPassword: string; nextPassword: string };
type ChangePasswordResponse = { updated: boolean };
type CreatePasswordResetRequest = { handle: string };
type CreatePasswordResetResponse = { accepted: boolean; previewToken?: string; expiresAt?: string };
type ResetPasswordRequest = { resetToken: string; newPassword: string; userAgent?: string };
type GetSessionRequest = { sessionToken: string };
type RevokeSessionRequest = { sessionToken: string };
export type IdentityUser = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
};
type IdentitySession = {
  sessionId: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};
type ListUsersResponse = {
  users: IdentityUser[];
};
type CreateSessionResponse = {
  sessionToken: string;
  session: IdentitySession;
};
type RevokeSessionResponse = {
  revoked: boolean;
};

type IdentityGrpcService = {
  getUserById(request: GetUserByIdRequest): Observable<IdentityUser>;
  getUserByHandle(request: GetUserByHandleRequest): Observable<IdentityUser>;
  listUsers(request: Record<string, never>): Observable<ListUsersResponse>;
  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse>;
  createPasswordSession(request: CreatePasswordSessionRequest): Observable<CreateSessionResponse>;
  registerPasswordUser(request: RegisterPasswordUserRequest): Observable<CreateSessionResponse>;
  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse>;
  createPasswordReset(request: CreatePasswordResetRequest): Observable<CreatePasswordResetResponse>;
  resetPassword(request: ResetPasswordRequest): Observable<CreateSessionResponse>;
  getSession(request: GetSessionRequest): Observable<IdentitySession>;
  revokeSession(request: RevokeSessionRequest): Observable<RevokeSessionResponse>;
};

@Injectable()
export class IdentityClientService implements OnModuleInit {
  private service!: IdentityGrpcService;

  constructor(@Inject("IDENTITY_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<IdentityGrpcService>("IdentityService");
  }

  getUserById(userId: string) {
    return lastValueFrom(this.service.getUserById({ userId }));
  }

  getUserByHandle(handle: string) {
    return lastValueFrom(this.service.getUserByHandle({ handle }));
  }

  async listUsers() {
    const response = await lastValueFrom(this.service.listUsers({}));
    return response.users;
  }

  createSession(userId: string, userAgent?: string) {
    const request = userAgent ? { userId, userAgent } : { userId };
    return lastValueFrom(this.service.createSession(request));
  }

  createPasswordSession(handle: string, password: string, userAgent?: string) {
    const request = userAgent ? { handle, password, userAgent } : { handle, password };
    return lastValueFrom(this.service.createPasswordSession(request));
  }

  registerPasswordUser(
    handle: string,
    displayName: string,
    password: string,
    userAgent?: string,
  ) {
    const request = userAgent
      ? { handle, displayName, password, userAgent }
      : { handle, displayName, password };
    return lastValueFrom(this.service.registerPasswordUser(request));
  }

  changePassword(userId: string, currentPassword: string, nextPassword: string) {
    return lastValueFrom(this.service.changePassword({ userId, currentPassword, nextPassword }));
  }

  createPasswordReset(handle: string) {
    return lastValueFrom(this.service.createPasswordReset({ handle }));
  }

  resetPassword(resetToken: string, newPassword: string, userAgent?: string) {
    const request = userAgent
      ? { resetToken, newPassword, userAgent }
      : { resetToken, newPassword };
    return lastValueFrom(this.service.resetPassword(request));
  }

  getSession(sessionToken: string) {
    return lastValueFrom(this.service.getSession({ sessionToken }));
  }

  revokeSession(sessionToken: string) {
    return lastValueFrom(this.service.revokeSession({ sessionToken }));
  }
}
