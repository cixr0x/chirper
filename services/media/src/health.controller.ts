import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class AppHealthController {
  @Get()
  getHealth() {
    return {
      service: "media",
      prefix: "media",
      tables: ["media_uploads", "media_assets", "media_variants", "media_outbox"],
      transports: ["http", "grpc", "nats"],
      status: "ok",
    };
  }
}
