import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { RealtimeClientService } from "./clients/realtime.client";

type NotificationRecord = {
  notificationId: string;
  recipientUserId: string;
  actorUserId: string;
  type: string;
  resourceId: string;
  isRead: boolean;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeClientService,
  ) {}

  async listNotifications(userId: string, limit = 20): Promise<NotificationRecord[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return notifications.map((notification) => this.mapNotification(notification));
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async createNotification(input: {
    recipientUserId: string;
    actorUserId: string;
    type: string;
    resourceId?: string;
  }): Promise<NotificationRecord> {
    const recipientUserId = input.recipientUserId.trim();
    const actorUserId = input.actorUserId.trim();
    const type = input.type.trim();
    const resourceId = input.resourceId?.trim() || "";

    const notification = await this.prisma.notification.upsert({
      where: {
        id: this.notificationIdFor(recipientUserId, actorUserId, type, resourceId),
      },
      update: {},
      create: {
        id: this.notificationIdFor(recipientUserId, actorUserId, type, resourceId),
        recipientId: recipientUserId,
        actorUserId,
        type,
        resourceId: resourceId || null,
      },
    });

    const deliveryAttemptId = `attempt_${notification.id}_realtime`;

    let deliveryStatus = "sent";
    try {
      await this.realtime.publishNotification({
        userId: notification.recipientId,
        notificationId: notification.id,
        actorUserId: notification.actorUserId,
        type: notification.type,
        resourceId: notification.resourceId ?? "",
        createdAt: notification.createdAt.toISOString(),
      });
    } catch {
      deliveryStatus = "failed";
    }

    await this.prisma.deliveryAttempt.upsert({
      where: { id: deliveryAttemptId },
      update: {
        status: deliveryStatus,
      },
      create: {
        id: deliveryAttemptId,
        notificationId: notification.id,
        channel: "realtime",
        status: deliveryStatus,
      },
    });

    return this.mapNotification(notification);
  }

  private notificationIdFor(
    recipientUserId: string,
    actorUserId: string,
    type: string,
    resourceId: string,
  ) {
    const hash = createHash("sha1")
      .update(`${recipientUserId}|${actorUserId}|${type}|${resourceId}`)
      .digest("hex")
      .slice(0, 32);

    return `notify_${hash}`;
  }

  private mapNotification(notification: {
    id: string;
    recipientId: string;
    actorUserId: string;
    type: string;
    resourceId: string | null;
    isRead: boolean;
    createdAt: Date;
  }): NotificationRecord {
    return {
      notificationId: notification.id,
      recipientUserId: notification.recipientId,
      actorUserId: notification.actorUserId,
      type: notification.type,
      resourceId: notification.resourceId ?? "",
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
