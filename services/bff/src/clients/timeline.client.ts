import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type TimelineEntry = {
  entryId: string;
  ownerUserId: string;
  sourcePostId: string;
  actorUserId: string;
  insertedAt: string;
  rankScore: number;
  activityType: string;
};

type ListHomeTimelineRequest = {
  ownerUserId: string;
  limit: number;
  cursor?: string;
};
type ListHomeTimelineResponse = {
  entries: TimelineEntry[];
  nextCursor?: string;
};
type RebuildHomeTimelineRequest = {
  ownerUserId: string;
  limit: number;
  cursor?: string;
};
type RebuildHomeTimelineResponse = {
  entries: TimelineEntry[];
  nextCursor?: string;
};
type FanOutPostRequest = {
  postId: string;
  authorUserId: string;
  createdAt: string;
};
type FanOutPostResponse = {
  insertedCount: number;
};

type TimelineGrpcService = {
  listHomeTimeline(request: ListHomeTimelineRequest): Observable<ListHomeTimelineResponse>;
  rebuildHomeTimeline(request: RebuildHomeTimelineRequest): Observable<RebuildHomeTimelineResponse>;
  fanOutPost(request: FanOutPostRequest): Observable<FanOutPostResponse>;
};

@Injectable()
export class TimelineClientService implements OnModuleInit {
  private service!: TimelineGrpcService;

  constructor(@Inject("TIMELINE_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<TimelineGrpcService>("TimelineService");
  }

  async listHomeTimeline(ownerUserId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listHomeTimeline({
        ownerUserId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      entries: response.entries ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async rebuildHomeTimeline(ownerUserId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.rebuildHomeTimeline({
        ownerUserId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      entries: response.entries ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  fanOutPost(request: FanOutPostRequest) {
    return lastValueFrom(this.service.fanOutPost(request));
  }
}
