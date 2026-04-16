import path from "node:path";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { RealtimeClientService } from "./clients/realtime.client";
import { HealthController } from "./health.controller";
import { loadServiceEnv } from "./load-env";
import { NotificationsGrpcController } from "./notifications.grpc.controller";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "./prisma.service";

loadServiceEnv();

@Module({
  imports: [
    ClientsModule.register([
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
  providers: [PrismaService, RealtimeClientService, NotificationsService],
})
export class AppModule {}
