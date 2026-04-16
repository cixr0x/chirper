import path from "node:path";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
import { PostsClientService } from "./clients/posts.client";
import { HealthController } from "./health.controller";
import { loadServiceEnv } from "./load-env";
import { PrismaService } from "./prisma.service";
import { ProjectionController } from "./projection.controller";
import { TimelineKafkaConsumerService } from "./timeline-kafka.consumer";
import { TimelineGrpcController } from "./timeline.grpc.controller";
import { TimelineService } from "./timeline.service";

loadServiceEnv();

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "IDENTITY_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "identity.v1",
          protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/identity/v1/identity.proto"),
          url: process.env.IDENTITY_GRPC_URL ?? "127.0.0.1:50051",
        },
      },
      {
        name: "GRAPH_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "graph.v1",
          protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/graph/v1/graph.proto"),
          url: process.env.GRAPH_GRPC_URL ?? "127.0.0.1:50054",
        },
      },
      {
        name: "POSTS_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "posts.v1",
          protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/posts/v1/posts.proto"),
          url: process.env.POSTS_GRPC_URL ?? "127.0.0.1:50053",
        },
      },
    ]),
  ],
  controllers: [HealthController, TimelineGrpcController, ProjectionController],
  providers: [
    PrismaService,
    IdentityClientService,
    GraphClientService,
    PostsClientService,
    TimelineService,
    TimelineKafkaConsumerService,
  ],
})
export class AppModule {}
