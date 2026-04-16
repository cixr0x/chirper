import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PostsOutboxPublisherService } from "./posts-outbox.publisher";
import { PrismaService } from "./prisma.service";
import { PostsGrpcController } from "./posts.grpc.controller";
import { PostsService } from "./posts.service";

@Module({
  controllers: [HealthController, PostsGrpcController],
  providers: [PrismaService, PostsService, PostsOutboxPublisherService],
})
export class AppModule {}
