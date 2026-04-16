import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "timeline",
      prefix: "timeline",
      tables: [
        "timeline_home_entries",
        "timeline_user_entries",
        "timeline_rank_state",
        "timeline_inbox",
      ],
      transports: ["http", "grpc", "nats"],
      status: "ok",
    };
  }
}
