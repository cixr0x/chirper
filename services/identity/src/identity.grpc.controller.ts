import { Controller } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { GrpcMethod, RpcException } from "@nestjs/microservices";
import { IdentityDirectoryService } from "./identity-directory.service";
import { IdentityPasswordError } from "./identity-password.error";
import { IdentityPasswordService } from "./identity-password.service";
import { IdentitySessionService } from "./identity-session.service";

@Controller()
export class IdentityGrpcController {
  constructor(
    private readonly directory: IdentityDirectoryService,
    private readonly passwords: IdentityPasswordService,
    private readonly sessions: IdentitySessionService,
  ) {}

  @GrpcMethod("IdentityService", "GetUserById")
  async getUserById(data: { userId: string }) {
    const user = await this.directory.getUserById(data.userId);

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Identity user ${data.userId} was not found`,
      });
    }

    return user;
  }

  @GrpcMethod("IdentityService", "GetUserByHandle")
  async getUserByHandle(data: { handle: string }) {
    const user = await this.directory.getUserByHandle(data.handle);

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Identity user handle ${data.handle} was not found`,
      });
    }

    return user;
  }

  @GrpcMethod("IdentityService", "ListUsers")
  async listUsers() {
    const users = await this.directory.listUsers();
    return { users };
  }

  @GrpcMethod("IdentityService", "CreateSession")
  async createSession(data: { userId: string; userAgent?: string }) {
    try {
      const session = await this.sessions.createSession(data.userId, data.userAgent);
      return {
        sessionToken: session.sessionToken,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      };
    } catch (error) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error instanceof Error ? error.message : `Identity user ${data.userId} was not found`,
      });
    }
  }

  @GrpcMethod("IdentityService", "CreatePasswordSession")
  async createPasswordSession(data: { handle: string; password: string; userAgent?: string }) {
    const session = await this.passwords.createPasswordSession(data.handle, data.password, data.userAgent);

    if (!session) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: "Invalid handle or password",
      });
    }

    return {
      sessionToken: session.sessionToken,
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    };
  }

  @GrpcMethod("IdentityService", "RegisterPasswordUser")
  async registerPasswordUser(data: {
    handle: string;
    displayName: string;
    password: string;
    userAgent?: string;
  }) {
    try {
      const session = await this.passwords.registerPasswordUser(
        data.handle,
        data.displayName,
        data.password,
        data.userAgent,
      );

      return {
        sessionToken: session.sessionToken,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      };
    } catch (error) {
      throw toPasswordRpcException(error);
    }
  }

  @GrpcMethod("IdentityService", "ChangePassword")
  async changePassword(data: { userId: string; currentPassword: string; nextPassword: string }) {
    try {
      return await this.passwords.changePassword(data.userId, data.currentPassword, data.nextPassword);
    } catch (error) {
      throw toPasswordRpcException(error);
    }
  }

  @GrpcMethod("IdentityService", "CreatePasswordReset")
  async createPasswordReset(data: { handle: string }) {
    try {
      return await this.passwords.createPasswordReset(data.handle);
    } catch (error) {
      throw toPasswordRpcException(error);
    }
  }

  @GrpcMethod("IdentityService", "ResetPassword")
  async resetPassword(data: { resetToken: string; newPassword: string; userAgent?: string }) {
    try {
      const session = await this.passwords.resetPassword(
        data.resetToken,
        data.newPassword,
        data.userAgent,
      );

      return {
        sessionToken: session.sessionToken,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      };
    } catch (error) {
      throw toPasswordRpcException(error);
    }
  }

  @GrpcMethod("IdentityService", "GetSession")
  async getSession(data: { sessionToken: string }) {
    const session = await this.sessions.getSession(data.sessionToken);

    if (!session) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: "Valid identity session required",
      });
    }

    return session;
  }

  @GrpcMethod("IdentityService", "RevokeSession")
  async revokeSession(data: { sessionToken: string }) {
    return this.sessions.revokeSession(data.sessionToken);
  }
}

function toPasswordRpcException(error: unknown) {
  if (error instanceof IdentityPasswordError) {
    return new RpcException({
      code: mapPasswordErrorCode(error.code),
      message: error.message,
    });
  }

  return new RpcException({
    code: status.INTERNAL,
    message: error instanceof Error ? error.message : "Identity password operation failed.",
  });
}

function mapPasswordErrorCode(code: IdentityPasswordError["code"]) {
  switch (code) {
    case "already_exists":
      return status.ALREADY_EXISTS;
    case "failed_precondition":
      return status.FAILED_PRECONDITION;
    case "invalid_argument":
      return status.INVALID_ARGUMENT;
    case "unauthenticated":
      return status.UNAUTHENTICATED;
    default:
      return status.INTERNAL;
  }
}
