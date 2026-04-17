import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type NotificationRecord = {
  notificationId: string;
  recipientUserId: string;
  actorUserId: string;
  type: string;
  resourceId: string;
  isRead: boolean;
  createdAt: string;
};

type ListNotificationsRequest = {
  userId: string;
  limit: number;
  cursor?: string;
};
type ListNotificationsResponse = {
  notifications: NotificationRecord[];
  nextCursor?: string;
};
type GetUnreadCountRequest = {
  userId: string;
};
type GetUnreadCountResponse = {
  unreadCount: number;
};
type CreateNotificationRequest = {
  recipientUserId: string;
  actorUserId: string;
  type: string;
  resourceId?: string;
};
type MarkAllReadRequest = {
  userId: string;
};
type MarkAllReadResponse = {
  updatedCount: number;
};

type NotificationsGrpcService = {
  listNotifications(request: ListNotificationsRequest): Observable<ListNotificationsResponse>;
  getUnreadCount(request: GetUnreadCountRequest): Observable<GetUnreadCountResponse>;
  createNotification(request: CreateNotificationRequest): Observable<NotificationRecord>;
  markAllRead(request: MarkAllReadRequest): Observable<MarkAllReadResponse>;
};

@Injectable()
export class NotificationsClientService implements OnModuleInit {
  private service!: NotificationsGrpcService;

  constructor(@Inject("NOTIFICATIONS_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<NotificationsGrpcService>("NotificationsService");
  }

  async listNotifications(userId: string, limit = 20, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listNotifications({
        userId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      notifications: response.notifications ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async getUnreadCount(userId: string) {
    const response = await lastValueFrom(this.service.getUnreadCount({ userId }));
    return response.unreadCount ?? 0;
  }

  createNotification(request: CreateNotificationRequest) {
    return lastValueFrom(this.service.createNotification(request));
  }

  markAllRead(userId: string) {
    return lastValueFrom(this.service.markAllRead({ userId }));
  }
}
