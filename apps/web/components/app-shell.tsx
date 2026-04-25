import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "../app/actions";
import { getNotifications, type UserSummary } from "../lib/bff";
import { getSessionToken } from "../lib/session";
import { AvatarBadge } from "./avatar-badge";
import { PrimaryNav, type PrimaryNavKey } from "./primary-nav";

type AppShellProps = {
  viewer: UserSummary | null;
  active?: PrimaryNavKey | undefined;
  notificationCount?: number;
  profileHrefOverride?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  showHeader?: boolean;
  wideCenter?: boolean;
  children: ReactNode;
  rightRail?: ReactNode;
};

export async function AppShell({
  viewer,
  active,
  notificationCount,
  profileHrefOverride,
  eyebrow,
  title,
  description,
  showHeader = true,
  wideCenter = false,
  children,
  rightRail,
}: AppShellProps) {
  const shellNotificationCount =
    viewer && notificationCount === undefined ? await getShellNotificationCount() : (notificationCount ?? 0);
  const profileHref = profileHrefOverride ?? (viewer ? `/u/${viewer.handle}` : "/");
  const navItems = [
    { key: "home" as const, label: "Home", href: "/", disabled: false, icon: "home" as const },
    { key: "messages" as const, label: "Chat", href: "/messages", disabled: false, icon: "messages" as const },
    {
      key: "profile" as const,
      label: "Profile",
      href: profileHref,
      disabled: !viewer && !profileHrefOverride,
      icon: "profile" as const,
    },
    {
      key: "notifications" as const,
      label: "Notifications",
      href: "/notifications",
      disabled: false,
      icon: "notifications" as const,
    },
  ].filter((item) => !item.disabled);

  return (
    <main className="social-root">
      <div className={`social-shell ${rightRail ? "" : "social-shell-no-rail"}`.trim()}>
        <aside className="social-sidebar">
          <div className="social-sidebar-frame">
            <Link className="brand-lockup" href="/">
              <span className="brand-mark">C</span>
              <span className="brand-copy">
                <strong>Chirper</strong>
                <span>microblogging lab</span>
              </span>
            </Link>

            <PrimaryNav
              active={active}
              items={navItems}
              notificationCount={shellNotificationCount}
              profileHref={profileHref}
            />

            {viewer ? (
              <div className="sidebar-account">
                <Link className="sidebar-compose-link" href="/#composer">
                  Post
                </Link>
                <div className="sidebar-account-card">
                  <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="small" />
                  <div>
                    <p className="sidebar-account-name">{viewer.displayName}</p>
                    <p className="sidebar-account-handle">@{viewer.handle}</p>
                  </div>
                </div>

                <div className="sidebar-account-actions">
                  <Link className="inline-link" href={profileHref}>
                    View profile
                  </Link>
                  <form action={signOutAction}>
                    <input name="redirectTo" type="hidden" value="/" />
                    <button className="sidebar-signout" type="submit">
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="sidebar-callout">
                <p className="sidebar-callout-title">Sign in to post, follow, and see your inbox.</p>
                <Link className="primary-link-button" href="/">
                  Open login
                </Link>
              </div>
            )}
          </div>
        </aside>

        <section className={`social-center ${wideCenter ? "social-center-wide" : ""}`.trim()}>
          {showHeader ? (
            <header className="column-header">
              <div>
                {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
                <h1>{title}</h1>
              </div>
              {description ? <p className="column-description">{description}</p> : null}
            </header>
          ) : null}
          <div className="column-body">{children}</div>
        </section>

        {rightRail ? (
          <aside className="social-rail">
            <div className="social-rail-frame">{rightRail}</div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}

async function getShellNotificationCount() {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return 0;
  }

  const notifications = await getNotifications(sessionToken, 1);
  return notifications.unreadCount;
}
