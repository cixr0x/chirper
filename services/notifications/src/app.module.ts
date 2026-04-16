import path from "node:path";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GraphClientService } from "./clients/graph.client";
import { RealtimeClientService } from "./clients/realtime.client";
import { HealthController } from "./health.controller";
import { loadServiceEnv } from "./load-env";
import { NotificationsKafkaConsumerService } from "./notifications-kafka.consumer";
import { NotificationsGrpcController } from "./notifications.grpc.controller";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "./prisma.service";

loadServiceEnv();

@Module({
  imports: [
    ClientsModule.register([
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
        name: "REALTIME_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "realtime.v1",
          protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/realtime/v1/realtime.proto"),
          url: process.env.REALTIME_GRPC_URL ?? "127.0.0.1:50057",
        },
      },
    ]),
  ],
  controllers: [HealthController, NotificationsGrpcController],
  providers: [
    PrismaService,
    GraphClientService,
    RealtimeClientService,
    NotificationsService,
    NotificationsKafkaConsumerService,
  ],
})
export class AppModule {}
