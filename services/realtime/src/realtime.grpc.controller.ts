import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { RealtimeService } from "./realtime.service";

@Controller()
export class RealtimeGrpcController {
  constructor(@Inject(RealtimeService) private readonly realtime: RealtimeService) {}

  @GrpcMethod("RealtimeService", "PublishNotification")
  publishNotification(data: {
    userId: string;
    notificationId: string;
    actorUserId: string;
    type: string;
    resourceId?: string;
    createdAt: string;
  }) {
    return this.realtime.publishNotification(data);
  }

  @GrpcMethod("RealtimeService", "ListBufferedEvents")
  listBufferedEvents(data: {
    userId: string;
    afterSequence?: number;
    limit?: number;
  }) {
    return this.realtime.listBufferedEvents(
      data.userId,
      data.afterSequence ?? 0,
      data.limit ?? 20,
    );
  }
}
