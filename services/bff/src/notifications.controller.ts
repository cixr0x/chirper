import { Controller, Get, Headers, Inject, Post, Query } from "@nestjs/common";
import { IdentityClientService } from "./clients/identity.client";
import { NotificationsClientService } from "./clients/notifications.client";
import { ProfileClientService } from "./clients/profile.client";
import { RealtimeClientService } from "./clients/realtime.client";
import { buildManagedAssetUrl } from "./media-url";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";

@Controller()
export class NotificationsController {
  constructor(
    @Inject(NotificationsClientService) private readonly notificationsClient: NotificationsClientService,
    @Inject(RealtimeClientService) private readonly realtimeClient: RealtimeClientService,
    @Inject(IdentityClientService) private readonly identityClient: IdentityClientService,
    @Inject(ProfileClientService) private readonly profileClient: ProfileClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
  ) {}

  @Get("notifications")
  async listNotifications(
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const viewerUserId = session.userId;
    const normalizedLimit = Number(limit ?? 8);
    const [notificationPage, unreadCount] = await Promise.all([
      this.notificationsClient.listNotifications(
        viewerUserId,
        Number.isNaN(normalizedLimit) ? 8 : normalizedLimit,
        cursor?.trim() || undefined,
      ),
      this.notificationsClient.getUnreadCount(viewerUserId),
    ]);

    return {
      unreadCount,
      notifications: await this.enrichNotifications(notificationPage.notifications),
      nextCursor: notificationPage.nextCursor,
    };
  }

  @Post("notifications/read-all")
  async markAllRead(@Headers(sessionHeaderName) sessionToken?: string) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return this.notificationsClient.markAllRead(session.userId);
  }

  @Get("realtime/events")
  async listRealtimeEvents(
    @Query("afterSequence") afterSequence?: string,
    @Query("limit") limit?: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const viewerUserId = session.userId;
    const normalizedAfter = Number(afterSequence ?? 0);
    const normalizedLimit = Number(limit ?? 12);
    const result = await this.realtimeClient.listBufferedEvents(
      viewerUserId,
      Number.isNaN(normalizedAfter) ? 0 : normalizedAfter,
      Number.isNaN(normalizedLimit) ? 12 : normalizedLimit,
    );

    return {
      nextSequence: result.nextSequence,
      events: await this.enrichNotifications(
        result.events.map((event) => ({
          notificationId: event.notificationId,
          recipientUserId: event.userId,
          actorUserId: event.actorUserId,
          type: event.type,
          resourceId: event.resourceId,
          isRead: false,
          createdAt: event.createdAt,
        })),
      ),
    };
  }

  private async enrichNotifications(
    notifications: {
      notificationId: string;
      recipientUserId: string;
      actorUserId: string;
      type: string;
      resourceId: string;
      isRead: boolean;
      createdAt: string;
    }[],
  ) {
    const actorIds = [...new Set(notifications.map((notification) => notification.actorUserId))];
    const actorEntries = await Promise.all(
      actorIds.map(async (actorUserId) => {
        const [identity, profile] = await Promise.all([
          this.identityClient.getUserById(actorUserId),
          this.profileClient.getProfileByUserId(actorUserId),
        ]);

        return [
          actorUserId,
          {
            userId: identity.userId,
            handle: identity.handle,
            displayName: identity.displayName,
            avatarUrl: profile.avatarAssetId ? buildManagedAssetUrl(profile.avatarAssetId) : profile.avatarUrl,
          },
        ] as const;
      }),
    );

    const actorMap = new Map(actorEntries);

    return notifications.map((notification) => ({
      notificationId: notification.notificationId,
      type: notification.type,
      resourceId: notification.resourceId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      summary: this.summaryFor(notification.type, actorMap.get(notification.actorUserId)?.displayName ?? "Someone"),
      actor: actorMap.get(notification.actorUserId),
    }));
  }

  private summaryFor(type: string, displayName: string) {
    if (type === "follow") {
      return `${displayName} followed you.`;
    }

    if (type === "new_post") {
      return `${displayName} published a new post.`;
    }

    if (type === "reply") {
      return `${displayName} replied to your post.`;
    }

    if (type === "like") {
      return `${displayName} liked your post.`;
    }

    if (type === "repost") {
      return `${displayName} reposted your post.`;
    }

    return `${displayName} triggered a notification.`;
  }
}
