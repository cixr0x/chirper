import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IdentityClientService } from "./clients/identity.client";
import { ProfileClientService } from "./clients/profile.client";
import {
  getGrpcErrorMessage,
  isGrpcAlreadyExists,
  isGrpcInvalidArgument,
  isGrpcUnauthenticated,
} from "./grpc-status";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";

@Controller()
export class SessionController {
  constructor(
    private readonly identityClient: IdentityClientService,
    private readonly profileClient: ProfileClientService,
    private readonly sessionAuth: SessionAuthService,
    private readonly userSummaryService: UserSummaryService,
  ) {}

  @Post("session")
  async createSession(
    @Body()
    body: {
      userId: string;
    },
    @Headers("user-agent") userAgent?: string,
  ) {
    const createdSession = await this.identityClient.createSession(body.userId, userAgent);
    return {
      sessionToken: createdSession.sessionToken,
      sessionId: createdSession.session.sessionId,
      expiresAt: createdSession.session.expiresAt,
      createdAt: createdSession.session.createdAt,
      viewer: await this.userSummaryService.getUserSummaryById(createdSession.session.userId),
    };
  }

  @Post("session/login")
  async createPasswordSession(
    @Body()
    body: {
      handle: string;
      password: string;
    },
    @Headers("user-agent") userAgent?: string,
  ) {
    let createdSession;
    try {
      createdSession = await this.identityClient.createPasswordSession(
        body.handle,
        body.password,
        userAgent,
      );
    } catch (error) {
      if (isGrpcUnauthenticated(error)) {
        throw new UnauthorizedException(getGrpcErrorMessage(error, "Invalid handle or password."));
      }

      throw error;
    }

    return {
      sessionToken: createdSession.sessionToken,
      sessionId: createdSession.session.sessionId,
      expiresAt: createdSession.session.expiresAt,
      createdAt: createdSession.session.createdAt,
      viewer: await this.userSummaryService.getUserSummaryById(createdSession.session.userId),
    };
  }

  @Post("session/register")
  async registerPasswordUser(
    @Body()
    body: {
      handle: string;
      displayName: string;
      password: string;
    },
    @Headers("user-agent") userAgent?: string,
  ) {
    let createdSession;
    try {
      createdSession = await this.identityClient.registerPasswordUser(
        body.handle,
        body.displayName,
        body.password,
        userAgent,
      );
    } catch (error) {
      if (isGrpcAlreadyExists(error)) {
        throw new ConflictException(
          getGrpcErrorMessage(error, "That handle is already taken."),
        );
      }

      if (isGrpcInvalidArgument(error)) {
        throw new BadRequestException(getGrpcErrorMessage(error, "Registration failed."));
      }

      throw error;
    }

    await this.profileClient.createProfile({
      userId: createdSession.session.userId,
    });

    return {
      sessionToken: createdSession.sessionToken,
      sessionId: createdSession.session.sessionId,
      expiresAt: createdSession.session.expiresAt,
      createdAt: createdSession.session.createdAt,
      viewer: await this.userSummaryService.getUserSummaryById(createdSession.session.userId),
    };
  }

  @Get("session")
  async getCurrentSession(@Headers(sessionHeaderName) sessionToken?: string) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      viewer: await this.userSummaryService.getUserSummaryById(session.userId),
    };
  }

  @Post("session/revoke")
  async revokeSession(@Headers(sessionHeaderName) sessionToken?: string) {
    return this.identityClient.revokeSession(sessionToken?.trim() ?? "");
  }
}
