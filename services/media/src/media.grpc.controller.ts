import { Controller, Inject } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import { GrpcMethod, RpcException } from "@nestjs/microservices";
import { MediaLibraryService } from "./media.service";

@Controller()
export class MediaGrpcController {
  constructor(@Inject(MediaLibraryService) private readonly mediaLibrary: MediaLibraryService) {}

  @GrpcMethod("MediaService", "CreateAssetFromSource")
  async createAssetFromSource(data: {
    ownerUserId: string;
    sourceUrl: string;
    purpose: string;
  }) {
    try {
      return await this.mediaLibrary.createAssetFromSource(data);
    } catch (error) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: error instanceof Error ? error.message : "Asset registration failed.",
      });
    }
  }

  @GrpcMethod("MediaService", "GetAssetById")
  async getAssetById(data: { assetId: string }) {
    try {
      return await this.mediaLibrary.getAssetById(data.assetId);
    } catch (error) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: error instanceof Error ? error.message : "Asset not found.",
      });
    }
  }

  @GrpcMethod("MediaService", "GetAssetsByIds")
  async getAssetsByIds(data: { assetIds?: string[] }) {
    return {
      assets: await this.mediaLibrary.getAssetsByIds(data.assetIds ?? []),
    };
  }
}
