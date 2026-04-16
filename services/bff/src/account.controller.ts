import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { IdentityClientService } from "./clients/identity.client";
import {
  getGrpcErrorMessage,
  isGrpcFailedPrecondition,
  isGrpcInvalidArgument,
  isGrpcUnauthenticated,
} from "./grpc-status";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";

@Controller("account")
export class AccountController {
  constructor(
    private readonly identityClient: IdentityClientService,
    private readonly sessionAuth: SessionAuthService,
    private readonly userSummaryService: UserSummaryService,
  ) {}

  @Post("password/change")
  async changePassword(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      currentPassword: string;
      nextPassword: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);

    try {
      return await this.identityClient.changePassword(
        session.userId,
        body.currentPassword,
        body.nextPassword,
      );
    } catch (error) {
      if (isGrpcInvalidArgument(error) || isGrpcFailedPrecondition(error)) {
        throw new BadRequestException(getGrpcErrorMessage(error, "Password change failed."));
      }

      throw error;
    }
  }

  @Post("password/reset/request")
  async createPasswordReset(
    @Body()
    body: {
      handle: string;
    },
  ) {
    try {
      return await this.identityClient.createPasswordReset(body.handle);
    } catch (error) {
      if (isGrpcInvalidArgument(error)) {
        throw new BadRequestException(
          getGrpcErrorMessage(error, "A valid handle is required for password resets."),
        );
      }

      throw error;
    }
  }

  @Post("password/reset/confirm")
  async resetPassword(
    @Body()
    body: {
      resetToken: string;
      newPassword: string;
    },
    @Headers("user-agent") userAgent?: string,
  ) {
    try {
      const createdSession = await this.identityClient.resetPassword(
        body.resetToken,
        body.newPassword,
        userAgent,
      );

      return {
        sessionToken: createdSession.sessionToken,
        sessionId: createdSession.session.sessionId,
        expiresAt: createdSession.session.expiresAt,
        createdAt: createdSession.session.createdAt,
        viewer: await this.userSummaryService.getUserSummaryById(createdSession.session.userId),
      };
    } catch (error) {
      if (isGrpcInvalidArgument(error)) {
        throw new BadRequestException(getGrpcErrorMessage(error, "Password reset failed."));
      }

      if (isGrpcUnauthenticated(error)) {
        throw new UnauthorizedException(
          getGrpcErrorMessage(error, "Valid reset token required."),
        );
      }

      throw error;
    }
  }
}
