import { BadRequestException, Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { ProfileClientService } from "./clients/profile.client";
import { getGrpcErrorMessage, isGrpcInvalidArgument } from "./grpc-status";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";

@Controller()
export class ProfileController {
  constructor(
    @Inject(ProfileClientService) private readonly profileClient: ProfileClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
    @Inject(UserSummaryService) private readonly userSummaryService: UserSummaryService,
  ) {}

  @Post("profile")
  async updateProfile(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body()
    body: {
      bio?: string;
      location?: string;
      avatarSourceUrl?: string;
      bannerSourceUrl?: string;
      clearAvatar?: boolean;
      clearBanner?: boolean;
      links?: {
        label?: string;
        url?: string;
      }[];
    },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const currentProfile = await this.profileClient.getProfileByUserId(session.userId);
    const avatarSourceUrl = body.avatarSourceUrl?.trim() ?? "";
    const bannerSourceUrl = body.bannerSourceUrl?.trim() ?? "";
    let avatarAssetId = currentProfile.avatarAssetId;
    let bannerAssetId = currentProfile.bannerAssetId;
    let avatarUrl = currentProfile.avatarUrl;
    let bannerUrl = currentProfile.bannerUrl;

    if (body.clearAvatar) {
      avatarAssetId = "";
      avatarUrl = "";
    }

    if (body.clearBanner) {
      bannerAssetId = "";
      bannerUrl = "";
    }

    if (avatarSourceUrl) {
      avatarAssetId = "";
      avatarUrl = avatarSourceUrl;
    }

    if (bannerSourceUrl) {
      bannerAssetId = "";
      bannerUrl = bannerSourceUrl;
    }

    try {
      await this.profileClient.updateProfile({
        userId: session.userId,
        bio: body.bio ?? "",
        location: body.location ?? "",
        avatarAssetId,
        bannerAssetId,
        avatarUrl,
        bannerUrl,
        links: body.links ?? [],
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
