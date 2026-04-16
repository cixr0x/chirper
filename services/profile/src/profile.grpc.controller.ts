import { Controller } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { GrpcMethod, RpcException } from "@nestjs/microservices";
import { ProfileDirectoryService } from "./profile-directory.service";

@Controller()
export class ProfileGrpcController {
  constructor(private readonly directory: ProfileDirectoryService) {}

  @GrpcMethod("ProfileService", "GetProfileByUserId")
  async getProfileByUserId(data: { userId: string }) {
    return this.directory.getProfileByUserId(data.userId);
  }

  @GrpcMethod("ProfileService", "CreateProfile")
  async createProfile(data: {
    userId: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }) {
    return this.directory.createProfile(data);
  }

  @GrpcMethod("ProfileService", "UpdateProfile")
  async updateProfile(data: {
    userId: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }) {
    try {
      return await this.directory.updateProfile(data);
    } catch (error) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error instanceof Error ? error.message : "Profile update failed.",
      });
    }
  }
}
