import "reflect-metadata";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { loadServiceEnv } from "./load-env";

async function bootstrap() {
  loadServiceEnv();
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api");

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "messages.v1",
      protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/messages/v1/messages.proto"),
      url: process.env.GRPC_BIND_URL ?? "0.0.0.0:50059",
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.PORT ?? 4009);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
