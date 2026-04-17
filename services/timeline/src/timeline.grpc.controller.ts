import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { TimelineService } from "./timeline.service";

@Controller()
export class TimelineGrpcController {
  constructor(@Inject(TimelineService) private readonly timeline: TimelineService) {}

  @GrpcMethod("TimelineService", "ListHomeTimeline")
  async listHomeTimeline(data: { ownerUserId: string; limit?: number; cursor?: string }) {
    return this.timeline.listHomeTimeline(
      data.ownerUserId,
      data.limit ?? 25,
      data.cursor?.trim() || undefined,
    );
  }

  @GrpcMethod("TimelineService", "RebuildHomeTimeline")
  async rebuildHomeTimeline(data: { ownerUserId: string; limit?: number; cursor?: string }) {
    return this.timeline.rebuildHomeTimeline(
      data.ownerUserId,
      data.limit ?? 25,
      data.cursor?.trim() || undefined,
    );
  }

  @GrpcMethod("TimelineService", "FanOutPost")
  async fanOutPost(data: { postId: string; authorUserId: string; createdAt: string }) {
    return this.timeline.fanOutPost({
      postId: data.postId,
      authorUserId: data.authorUserId,
      createdAt: data.createdAt,
    });
  }
}
