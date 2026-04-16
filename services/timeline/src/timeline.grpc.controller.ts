import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { TimelineService } from "./timeline.service";

@Controller()
export class TimelineGrpcController {
  constructor(private readonly timeline: TimelineService) {}

  @GrpcMethod("TimelineService", "ListHomeTimeline")
  async listHomeTimeline(data: { ownerUserId: string; limit?: number }) {
    return {
      entries: await this.timeline.listHomeTimeline(data.ownerUserId, data.limit ?? 25),
    };
  }

  @GrpcMethod("TimelineService", "RebuildHomeTimeline")
  async rebuildHomeTimeline(data: { ownerUserId: string; limit?: number }) {
    return {
      entries: await this.timeline.rebuildHomeTimeline(data.ownerUserId, data.limit ?? 25),
    };
  }

  @GrpcMethod("TimelineService", "FanOutPost")
  async fanOutPost(data: { postId: string; authorUserId: string; createdAt: string }) {
    return this.timeline.fanOutPost(data);
  }
}
