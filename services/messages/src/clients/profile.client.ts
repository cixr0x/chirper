import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type ProfileSummary = {
  userId: string;
  bio: string;
  location: string;
  avatarAssetId: string;
  bannerAssetId: string;
  avatarUrl: string;
  bannerUrl: string;
  allowDirectInbox: boolean;
  links: {
    label: string;
    url: string;
  }[];
};

type GetProfileByUserIdRequest = {
  userId: string;
};

type ProfileGrpcService = {
  getProfileByUserId(request: GetProfileByUserIdRequest): Observable<Partial<ProfileSummary> & Pick<ProfileSummary, "userId">>;
};

@Injectable()
export class ProfileClientService implements OnModuleInit {
  private service!: ProfileGrpcService;

  constructor(@Inject("PROFILE_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<ProfileGrpcService>("ProfileService");
  }

  async getProfileByUserId(userId: string): Promise<ProfileSummary> {
    const response = await lastValueFrom(this.service.getProfileByUserId({ userId }));
    return {
      userId: response.userId,
      bio: response.bio ?? "",
      location: response.location ?? "",
      avatarAssetId: response.avatarAssetId ?? "",
      bannerAssetId: response.bannerAssetId ?? "",
      avatarUrl: response.avatarUrl ?? "",
      bannerUrl: response.bannerUrl ?? "",
      allowDirectInbox: response.allowDirectInbox ?? true,
      links: response.links ?? [],
    };
  }
}
