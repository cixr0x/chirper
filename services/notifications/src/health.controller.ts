import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "notifications",
      prefix: "notify",
      tables: [
        "notify_follow_edges",
        "notify_notifications",
        "notify_preferences",
        "notify_delivery_attempts",
        "notify_inbox",
      ],
      transports: ["http", "grpc", "kafka"],
      status: "ok",
    };
  }
}
