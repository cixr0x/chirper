import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type GetProfileByUserIdRequest = { userId: string };
type CreateProfileRequest = {
  userId: string;
  bio?: string;
  location?: string;
  avatarAssetId?: string;
  bannerAssetId?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  links?: {
    label?: string;
    url?: string;
  }[];
};
type UpdateProfileRequest = CreateProfileRequest;
type GetProfileByUserIdResponse = {
  userId: string;
  bio: string;
  location: string;
  avatarAssetId: string;
  bannerAssetId: string;
  avatarUrl: string;
  bannerUrl: string;
  links: {
    label: string;
    url: string;
  }[];
};

type ProfileGrpcService = {
  getProfileByUserId(request: GetProfileByUserIdRequest): Observable<GetProfileByUserIdResponse>;
  createProfile(request: CreateProfileRequest): Observable<GetProfileByUserIdResponse>;
  updateProfile(request: UpdateProfileRequest): Observable<GetProfileByUserIdResponse>;
};

@Injectable()
export class ProfileClientService implements OnModuleInit {
  private service!: ProfileGrpcService;

  constructor(@Inject("PROFILE_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<ProfileGrpcService>("ProfileService");
  }

  getProfileByUserId(userId: string) {
    return lastValueFrom(this.service.getProfileByUserId({ userId })).then(normalizeProfileResponse);
  }

  createProfile(request: CreateProfileRequest) {
    return lastValueFrom(this.service.createProfile(request)).then(normalizeProfileResponse);
  }

  updateProfile(request: UpdateProfileRequest) {
    return lastValueFrom(this.service.updateProfile(request)).then(normalizeProfileResponse);
  }
}

function normalizeProfileResponse(response: GetProfileByUserIdResponse) {
  return {
    ...response,
    avatarAssetId: response.avatarAssetId ?? "",
    bannerAssetId: response.bannerAssetId ?? "",
    avatarUrl: response.avatarUrl ?? "",
    bannerUrl: response.bannerUrl ?? "",
    links: response.links ?? [],
  };
}
