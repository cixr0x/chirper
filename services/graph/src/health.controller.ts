import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "graph",
      prefix: "graph",
      tables: ["graph_follows", "graph_blocks", "graph_mutes", "graph_outbox"],
      transports: ["http", "grpc", "kafka"],
      status: "ok",
    };
  }
}
