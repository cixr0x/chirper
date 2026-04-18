import Link from "next/link";
import { type NotificationItem, formatPostTimestamp } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type NotificationListProps = {
  items: NotificationItem[];
  emptyTitle: string;
  emptyBody: string;
};

export function NotificationList({ items, emptyTitle, emptyBody }: NotificationListProps) {
  if (items.length === 0) {
    return (
      <article className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </article>
    );
  }

  return (
    <div className="notification-list">
      {items.map((notification) => (
        <article className="notification-card" key={notification.notificationId}>
          <div className="feed-head">
            <AvatarBadge
              avatarUrl={notification.actor?.avatarUrl}
              displayName={notification.actor?.displayName ?? "Unknown actor"}
              size="small"
            />
            <div>
              <h3>{notification.actor?.displayName ?? "Unknown actor"}</h3>
              <p className="handle">
                {notification.actor ? (
                  <Link className="inline-link" href={`/u/${notification.actor.handle}`}>
                    @{notification.actor.handle}
                  </Link>
                ) : (
                  "system"
                )}{" "}
                | {formatPostTimestamp(notification.createdAt)}
              </p>
            </div>
          </div>
          <p className="notification-copy">{notification.summary}</p>
        </article>
      ))}
    </div>
  );
}
