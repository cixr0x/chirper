import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

type PublishNotificationRequest = {
  userId: string;
  notificationId: string;
  actorUserId: string;
  type: string;
  resourceId?: string;
  createdAt: string;
};

type PublishNotificationResponse = {
  sequence: number;
};

type RealtimeGrpcService = {
  publishNotification(
    request: PublishNotificationRequest,
  ): Observable<PublishNotificationResponse>;
};

@Injectable()
export class RealtimeClientService implements OnModuleInit {
  private service!: RealtimeGrpcService;

  constructor(@Inject("REALTIME_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<RealtimeGrpcService>("RealtimeService");
  }

  publishNotification(request: PublishNotificationRequest) {
    return lastValueFrom(this.service.publishNotification(request));
  }
}
