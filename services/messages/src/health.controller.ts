import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "messages",
      prefix: "msg",
      tables: ["msg_conversations", "msg_messages", "msg_conversation_reads"],
      transports: ["http", "grpc"],
      status: "ok",
    };
  }
}
