import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "identity",
      prefix: "ident",
      tables: ["ident_users", "ident_credentials", "ident_sessions", "ident_outbox"],
      transports: ["http", "grpc", "nats"],
      status: "ok",
    };
  }
}

