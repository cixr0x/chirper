import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: "posts",
      prefix: "posts",
      tables: ["posts_posts", "posts_likes", "posts_reposts", "posts_post_media", "posts_outbox"],
      transports: ["http", "grpc", "kafka"],
      status: "ok",
    };
  }
}
