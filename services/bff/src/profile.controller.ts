import { BadRequestException, Body, Controller, Headers, Post } from "@nestjs/common";
import { ProfileClientService } from "./clients/profile.client";
import { getGrpcErrorMessage, isGrpcInvalidArgument } from "./grpc-status";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";

@Controller()
export class ProfileController {
  constructor(
    private readonly profileClient: ProfileClientService,
    private readonly sessionAuth: SessionAuthService,
    private readonly userSummaryService: UserSummaryService,
  ) {}

  @Post("profile")
  async updateProfile(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      bio?: string;
      location?: string;
      avatarUrl?: string;
      bannerUrl?: string;
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);

    try {
      await this.profileClient.updateProfile({
        userId: session.userId,
        bio: body.bio ?? "",
        location: body.location ?? "",
        avatarUrl: body.avatarUrl ?? "",
        bannerUrl: body.bannerUrl ?? "",
      });
    } catch (error) {
      if (isGrpcInvalidArgument(error)) {
        throw new BadRequestException(getGrpcErrorMessage(error, "Profile update failed."));
      }

      throw error;
    }

    return this.userSummaryService.getUserSummaryById(session.userId);
  }
}
