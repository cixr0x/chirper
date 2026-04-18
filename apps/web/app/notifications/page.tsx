import Link from "next/link";
import { redirect } from "next/navigation";
import { markNotificationsReadAction } from "../actions";
import { AppShell } from "../../components/app-shell";
import { LiveNotificationEvents } from "../../components/live-notification-events";
import { NotificationList } from "../../components/notification-list";
import { getNotifications } from "../../lib/bff";
import { appendCursorTrail, collectPaginatedPages, parseCursorTrail } from "../../lib/pagination";
import { getSessionState, getSessionToken } from "../../lib/session";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams?: Promise<{
    trail?: string;
  }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const [filters, session, sessionToken] = await Promise.all([
    searchParams ? searchParams : Promise.resolve(undefined),
    getSessionState(),
    getSessionToken(),
  ]);

  if (!session || !sessionToken) {
    redirect("/");
  }

  const notificationTrail = parseCursorTrail(filters?.trail);
  const notificationsResult = await collectPaginatedPages({
    trail: notificationTrail,
    loadPage: (cursor) => getNotifications(sessionToken, 8, cursor),
    getItems: (page) => page.notifications,
    getNextCursor: (page) => page.nextCursor,
  });

  return (
    <AppShell
      active="notifications"
      description="Everything people are doing around your posts and profile, in one focused view."
      eyebrow="Inbox"
      notificationCount={notificationsResult.lastPage.unreadCount}
      title="Notifications"
      viewer={session.viewer}
      rightRail={
        <>
          <section className="rail-card">
            <p className="eyebrow">Status</p>
            <h2>{notificationsResult.lastPage.unreadCount} unread</h2>
            <p className="muted-copy">
              Follow, like, repost, reply, and new-post activity all lands here.
            </p>
            <form action={markNotificationsReadAction}>
              <input name="targetPath" type="hidden" value="/notifications" />
              <button className="secondary-button compact wide-button" type="submit">
                Mark all as read
              </button>
            </form>
          </section>

          <section className="rail-card">
            <LiveNotificationEvents />
          </section>
        </>
      }
    >
      <section className="panel timeline-panel">
        <NotificationList
          emptyBody="Follow activity and posts from followed accounts will appear here."
          emptyTitle="No notifications yet"
          items={notificationsResult.items}
        />
        {notificationsResult.nextCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail("/notifications", filters, "trail", notificationsResult.nextCursor)}
            >
              Load more notifications
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
