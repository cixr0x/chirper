import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type RealtimeEvent = {
  sequence: number;
  userId: string;
  notificationId: string;
  actorUserId: string;
  type: string;
  resourceId: string;
  createdAt: string;
};

type ListBufferedEventsRequest = {
  userId: string;
  afterSequence: number;
  limit: number;
};
type ListBufferedEventsResponse = {
  events: RealtimeEvent[];
  nextSequence: number;
};

type RealtimeGrpcService = {
  listBufferedEvents(request: ListBufferedEventsRequest): Observable<ListBufferedEventsResponse>;
};

@Injectable()
export class RealtimeClientService implements OnModuleInit {
  private service!: RealtimeGrpcService;

  constructor(@Inject("REALTIME_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<RealtimeGrpcService>("RealtimeService");
  }

  async listBufferedEvents(userId: string, afterSequence = 0, limit = 20) {
    const response = await lastValueFrom(
      this.service.listBufferedEvents({ userId, afterSequence, limit }),
    );

    return {
      events: response.events ?? [],
      nextSequence: response.nextSequence ?? 0,
    };
  }
}
