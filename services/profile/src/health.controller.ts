import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "profile",
      prefix: "profile",
      tables: ["profile_profiles", "profile_settings", "profile_profile_links", "profile_outbox"],
      transports: ["http", "grpc", "nats"],
      status: "ok",
    };
  }
}

