import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ProfileDirectoryService } from "./profile-directory.service";
import { ProfileGrpcController } from "./profile.grpc.controller";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [HealthController, ProfileGrpcController],
  providers: [PrismaService, ProfileDirectoryService],
})
export class AppModule {}
