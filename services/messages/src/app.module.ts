import path from "node:path";
import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
import { ProfileClientService } from "./clients/profile.client";
import { HealthController } from "./health.controller";
import { loadServiceEnv } from "./load-env";
import { MessagesService } from "./messages.service";
import { PrismaService } from "./prisma.service";

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
        name: "PROFILE_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "profile.v1",
          protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/profile/v1/profile.proto"),
          url: process.env.PROFILE_GRPC_URL ?? "127.0.0.1:50052",
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
    ]),
  ],
  controllers: [HealthController],
  providers: [PrismaService, IdentityClientService, ProfileClientService, GraphClientService, MessagesService],
})
export class AppModule {}
