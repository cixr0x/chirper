import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  DOMAIN_EVENTS,
  type GraphFollowCreatedEvent,
  type GraphFollowRemovedEvent,
  type PostPublishedEvent,
} from "@chirper/contracts-events";
import { Prisma } from "../generated/prisma";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
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
    private readonly identityClient: IdentityClientService,
    private readonly graphClient: GraphClientService,
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

  async consumePostPublishedEvent(event: PostPublishedEvent) {
    const eventReserved = await this.reserveInboxEvent(event);
    if (!eventReserved) {
      return;
    }

    const followerUserIds = await this.listProjectedFollowers(event.payload.authorUserId);
    await Promise.allSettled(
      followerUserIds.map((recipientUserId) =>
        this.createNotification({
          recipientUserId,
          actorUserId: event.payload.authorUserId,
          type: "new_post",
          resourceId: event.payload.postId,
        }),
      ),
    );

    await this.markInboxProcessed(event.id, DOMAIN_EVENTS.postPublished);
  }

  async consumeGraphFollowCreatedEvent(event: GraphFollowCreatedEvent) {
    const eventReserved = await this.reserveInboxEvent(event);
    if (!eventReserved) {
      return;
    }

    await this.prisma.followEdge.upsert({
      where: {
        ownerUserId_followeeUserId: {
          ownerUserId: event.payload.followerUserId,
          followeeUserId: event.payload.followeeUserId,
        },
      },
      update: {},
      create: {
        id: this.followEdgeId(event.payload.followerUserId, event.payload.followeeUserId),
        ownerUserId: event.payload.followerUserId,
        followeeUserId: event.payload.followeeUserId,
      },
    });

    await this.createNotification({
      recipientUserId: event.payload.followeeUserId,
      actorUserId: event.payload.followerUserId,
      type: "follow",
      resourceId: event.payload.followId,
    });

    await this.markInboxProcessed(event.id, DOMAIN_EVENTS.graphFollowCreated);
  }

  async consumeGraphFollowRemovedEvent(event: GraphFollowRemovedEvent) {
    const eventReserved = await this.reserveInboxEvent(event);
    if (!eventReserved) {
      return;
    }

    await this.prisma.followEdge.deleteMany({
      where: {
        ownerUserId: event.payload.followerUserId,
        followeeUserId: event.payload.followeeUserId,
      },
    });

    await this.markInboxProcessed(event.id, DOMAIN_EVENTS.graphFollowRemoved);
  }

  async rebuildFollowProjection() {
    const users = await this.identityClient.listUsers();
    const followEdges: Prisma.FollowEdgeCreateManyInput[] = [];

    for (const user of users) {
      const followeeUserIds = await this.graphClient.listFollowing(user.userId);
      for (const followeeUserId of followeeUserIds) {
        followEdges.push({
          id: this.followEdgeId(user.userId, followeeUserId),
          ownerUserId: user.userId,
          followeeUserId,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.followEdge.deleteMany({});

      if (followEdges.length > 0) {
        await tx.followEdge.createMany({
          data: followEdges,
          skipDuplicates: true,
        });
      }
    });

    return {
      userCount: users.length,
      followEdgeCount: followEdges.length,
    };
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

  private followEdgeId(ownerUserId: string, followeeUserId: string) {
    return `follow_${ownerUserId}_${followeeUserId}`;
  }

  private async listProjectedFollowers(followeeUserId: string) {
    const edges = await this.prisma.followEdge.findMany({
      where: { followeeUserId },
      orderBy: [{ createdAt: "desc" }],
    });

    return edges.map((edge) => edge.ownerUserId);
  }

  private async reserveInboxEvent(
    event: PostPublishedEvent | GraphFollowCreatedEvent | GraphFollowRemovedEvent,
  ) {
    const existingInbox = await this.prisma.inboxEvent.findUnique({
      where: { id: event.id },
    });

    if (existingInbox?.processedAt) {
      return false;
    }

    await this.prisma.inboxEvent.upsert({
      where: { id: event.id },
      update: {
        eventType: event.name,
        payload: event as Prisma.InputJsonValue,
      },
      create: {
        id: event.id,
        eventType: event.name,
        payload: event as Prisma.InputJsonValue,
      },
    });

    return true;
  }

  private async markInboxProcessed(id: string, eventType: string) {
    await this.prisma.inboxEvent.update({
      where: { id },
      data: {
        eventType,
        processedAt: new Date(),
      },
    });
  }
}
