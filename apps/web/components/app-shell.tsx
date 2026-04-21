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
    { key: "home" as const, label: "Home", href: "/", disabled: false },
    { key: "messages" as const, label: "Chat", href: "/messages", disabled: !viewer },
    { key: "profile" as const, label: "Profile", href: profileHref, disabled: !viewer },
    { key: "notifications" as const, label: "Notifications", href: "/notifications", disabled: !viewer },
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
                    <span>{item.label}</span>
                    {item.key === "notifications" && notificationCount > 0 ? (
                      <span className="nav-count">{notificationCount}</span>
                    ) : null}
                  </span>
                ) : (
                  <Link className={`nav-link ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}>
                    <span>{item.label}</span>
                    {item.key === "notifications" && notificationCount > 0 ? (
                      <span className="nav-count">{notificationCount}</span>
                    ) : null}
                  </Link>
                ),
              )}
            </nav>

            {viewer ? (
              <div className="sidebar-account">
                <div className="sidebar-account-card">
                  <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="small" />
                  <div>
                    <p className="sidebar-account-name">{viewer.displayName}</p>
                    <p className="sidebar-account-handle">@{viewer.handle}</p>
                  </div>
                </div>

                <form action={signOutAction}>
                  <input name="redirectTo" type="hidden" value="/" />
                  <button className="secondary-button compact wide-button" type="submit">
                    Sign out
                  </button>
                </form>
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
