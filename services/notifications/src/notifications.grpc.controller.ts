import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsGrpcController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @GrpcMethod("NotificationsService", "ListNotifications")
  async listNotifications(data: { userId: string; limit?: number; cursor?: string }) {
    return this.notifications.listNotifications(
      data.userId,
      data.limit ?? 20,
      data.cursor?.trim() || undefined,
    );
  }

  @GrpcMethod("NotificationsService", "GetUnreadCount")
  async getUnreadCount(data: { userId: string }) {
    return this.notifications.getUnreadCount(data.userId);
  }

  @GrpcMethod("NotificationsService", "CreateNotification")
  async createNotification(data: {
    recipientUserId: string;
    actorUserId: string;
    type: string;
    resourceId?: string;
  }) {
    return this.notifications.createNotification(data);
  }

  @GrpcMethod("NotificationsService", "MarkAllRead")
  async markAllRead(data: { userId: string }) {
    return this.notifications.markAllRead(data.userId);
  }
}
