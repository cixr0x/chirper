import { Module } from "@nestjs/common";
import { AppHealthController } from "./health.controller";
import { MediaGrpcController } from "./media.grpc.controller";
import { MediaLibraryService } from "./media.service";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [AppHealthController, MediaGrpcController],
  providers: [PrismaService, MediaLibraryService],
})
export class AppModule {}
