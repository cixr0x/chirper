import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { IdentityDirectoryService } from "./identity-directory.service";
import { IdentityGrpcController } from "./identity.grpc.controller";
import { IdentityPasswordService } from "./identity-password.service";
import { IdentitySessionService } from "./identity-session.service";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [HealthController, IdentityGrpcController],
  providers: [PrismaService, IdentityDirectoryService, IdentitySessionService, IdentityPasswordService],
})
export class AppModule {}
