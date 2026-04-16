import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";

@Controller()
export class NotificationsGrpcController {
  constructor(private readonly notifications: NotificationsService) {}

  @GrpcMethod("NotificationsService", "ListNotifications")
  async listNotifications(data: { userId: string; limit?: number }) {
    return {
      notifications: await this.notifications.listNotifications(data.userId, data.limit ?? 20),
    };
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
