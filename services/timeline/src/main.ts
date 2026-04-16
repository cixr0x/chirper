import "reflect-metadata";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";
import { loadServiceEnv } from "./load-env";

async function bootstrap() {
  loadServiceEnv();
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api");

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "timeline.v1",
      protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/timeline/v1/timeline.proto"),
      url: process.env.GRPC_BIND_URL ?? "0.0.0.0:50055",
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.PORT ?? 4005);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
