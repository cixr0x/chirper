import { Module } from "@nestjs/common";
import { GraphGrpcController } from "./graph.grpc.controller";
import { GraphOutboxPublisherService } from "./graph-outbox.publisher";
import { GraphService } from "./graph.service";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [HealthController, GraphGrpcController],
  providers: [PrismaService, GraphService, GraphOutboxPublisherService],
})
export class AppModule {}
