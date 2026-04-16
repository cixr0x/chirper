import { Module } from "@nestjs/common";
import { GraphGrpcController } from "./graph.grpc.controller";
import { GraphService } from "./graph.service";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [HealthController, GraphGrpcController],
  providers: [PrismaService, GraphService],
})
export class AppModule {}
