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

  const groupedItems = groupNotifications(items);

  return (
    <div className="notification-list">
      {groupedItems.map(({ count, notification }) => (
        <article className="notification-card" key={notification.notificationId}>
          <div className="notification-card-head">
            <div className="notification-actor">
              <AvatarBadge
                avatarUrl={notification.actor?.avatarUrl}
                displayName={notification.actor?.displayName ?? "Unknown actor"}
                size="small"
              />
              <div className="notification-actor-copy">
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
            <div className="notification-state">
              <span className={`notification-kind ${notification.isRead ? "" : "unread"}`.trim()}>
                {formatNotificationType(notification.type)}
                {count > 1 ? ` x${count}` : ""}
              </span>
            </div>
          </div>
          <p className="notification-copy">
            {notification.summary}
            {count > 1 ? ` ${count} similar updates grouped.` : ""}
          </p>
        </article>
      ))}
    </div>
  );
}

function groupNotifications(items: NotificationItem[]) {
  const groups: { count: number; notification: NotificationItem }[] = [];
  const seen = new Map<string, { count: number; notification: NotificationItem }>();

  for (const notification of items) {
    const key = [
      notification.actor?.userId ?? notification.actor?.handle ?? "system",
      notification.type,
      notification.summary,
    ].join(":");
    const group = seen.get(key);

    if (group) {
      group.count += 1;
      group.notification = {
        ...group.notification,
        isRead: group.notification.isRead && notification.isRead,
      };
      continue;
    }

    const nextGroup = { count: 1, notification };
    seen.set(key, nextGroup);
    groups.push(nextGroup);
  }

  return groups;
}

function formatNotificationType(type: string) {
  switch (type) {
    case "new_post":
      return "Post";
    case "follow":
      return "Follow";
    case "reply":
      return "Reply";
    case "like":
      return "Like";
    case "repost":
      return "Repost";
    default:
      return type.replace(/_/g, " ");
  }
}
