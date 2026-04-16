import { Injectable } from "@nestjs/common";
import { IdentityClientService } from "./clients/identity.client";
import { ProfileClientService } from "./clients/profile.client";

@Injectable()
export class UserSummaryService {
  constructor(
    private readonly identityClient: IdentityClientService,
    private readonly profileClient: ProfileClientService,
  ) {}

  async listUsers() {
    const identities = await this.identityClient.listUsers();
    return Promise.all(identities.map((identity) => this.buildSummary(identity)));
  }

  async getUserSummaryById(userId: string) {
    const identity = await this.identityClient.getUserById(userId);
    return this.buildSummary(identity);
  }

  async getUserSummaryByHandle(handle: string) {
    const identity = await this.identityClient.getUserByHandle(handle);
    return this.buildSummary(identity);
  }

  private async buildSummary(identity: {
    userId: string;
    handle: string;
    displayName: string;
    status: string;
  }) {
    const profile = await this.profileClient.getProfileByUserId(identity.userId);

    return {
      userId: identity.userId,
      handle: identity.handle,
      displayName: identity.displayName,
      status: identity.status,
      bio: profile.bio,
      location: profile.location,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      links: profile.links,
    };
  }
}
