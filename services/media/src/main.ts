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
      package: "media.v1",
      protoPath: path.resolve(process.cwd(), "../../packages/contracts-proto/proto/media/v1/media.proto"),
      url: process.env.GRPC_BIND_URL ?? "0.0.0.0:50058",
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.PORT ?? 4008);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
