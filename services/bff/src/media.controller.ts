import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { status } from "@grpc/grpc-js";
import type { FastifyReply } from "fastify";
import { MediaClientService } from "./clients/media.client";
import { hasGrpcStatus } from "./grpc-status";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaClient: MediaClientService) {}

  @Get("assets/:assetId/redirect")
  async redirectToAsset(
    @Param("assetId") assetId: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    try {
      const asset = await this.mediaClient.getAssetById(assetId);
      return reply.redirect(asset.sourceUrl);
    } catch (error) {
      if (hasGrpcStatus(error, status.NOT_FOUND)) {
        throw new NotFoundException("Asset not found.");
      }

      throw error;
    }
  }
}
