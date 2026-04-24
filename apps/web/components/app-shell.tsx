import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "../app/actions";
import type { UserSummary } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type AppShellProps = {
  viewer: UserSummary | null;
  active?: "home" | "messages" | "profile" | "notifications" | undefined;
  notificationCount?: number;
  eyebrow?: string;
  title: string;
  description?: string;
  showHeader?: boolean;
  children: ReactNode;
  rightRail?: ReactNode;
};

export function AppShell({
  viewer,
  active,
  notificationCount = 0,
  eyebrow,
  title,
  description,
  showHeader = true,
  children,
  rightRail,
}: AppShellProps) {
  const profileHref = viewer ? `/u/${viewer.handle}` : "/";
  const navItems = [
    { key: "home" as const, label: "Home", href: "/", disabled: false, icon: "home" as const },
    { key: "messages" as const, label: "Chat", href: "/messages", disabled: !viewer, icon: "messages" as const },
    { key: "profile" as const, label: "Profile", href: profileHref, disabled: !viewer, icon: "profile" as const },
    {
      key: "notifications" as const,
      label: "Notifications",
      href: "/notifications",
      disabled: !viewer,
      icon: "notifications" as const,
    },
  ];

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

            <nav className="primary-nav" aria-label="Primary">
              {navItems.map((item) =>
                item.disabled ? (
                  <span
                    aria-disabled="true"
                    className={`nav-link nav-link-disabled ${active === item.key ? "active" : ""}`}
                    key={item.key}
                  >
                    <span className="nav-link-main">
                      <NavIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </span>
                    {item.key === "notifications" && notificationCount > 0 ? (
                      <span className="nav-count">{notificationCount}</span>
                    ) : null}
                  </span>
                ) : (
                  <Link className={`nav-link ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}>
                    <span className="nav-link-main">
                      <NavIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </span>
                    {item.key === "notifications" && notificationCount > 0 ? (
                      <span className="nav-count">{notificationCount}</span>
                    ) : null}
                  </Link>
                ),
              )}
            </nav>

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

        <section className="social-center">
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

function NavIcon({ icon }: { icon: "home" | "messages" | "profile" | "notifications" }) {
  switch (icon) {
    case "home":
      return (
        <span className="nav-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M4.5 10.5 12 4l7.5 6.5V20h-5.25v-5.25h-4.5V20H4.5v-9.5Z" />
          </svg>
        </span>
      );
    case "messages":
      return (
        <span className="nav-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M6 7.5h12A1.5 1.5 0 0 1 19.5 9v7.5A1.5 1.5 0 0 1 18 18H9l-4.5 3V9A1.5 1.5 0 0 1 6 7.5Z" />
          </svg>
        </span>
      );
    case "notifications":
      return (
        <span className="nav-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.6c0 .9-.32 1.77-.9 2.45L5 16.5h14l-1.6-2.45a4.5 4.5 0 0 1-.9-2.45V9A4.5 4.5 0 0 0 12 4.5Z" />
            <path d="M9.75 18.75a2.25 2.25 0 0 0 4.5 0" />
          </svg>
        </span>
      );
    case "profile":
      return (
        <span className="nav-icon" aria-hidden="true">
          <svg fill="none" viewBox="0 0 24 24">
            <path d="M12 12a3.75 3.75 0 1 0 0-7.5A3.75 3.75 0 0 0 12 12Z" />
            <path d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0" />
          </svg>
        </span>
      );
  }
}
