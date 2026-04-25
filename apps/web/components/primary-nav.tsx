"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PrimaryNavKey = "home" | "messages" | "profile" | "notifications";

type PrimaryNavItem = {
  key: PrimaryNavKey;
  label: string;
  href: string;
  disabled: boolean;
  icon: PrimaryNavKey;
};

type PrimaryNavProps = {
  active?: PrimaryNavKey | undefined;
  items: PrimaryNavItem[];
  notificationCount: number;
  profileHref: string;
};

export function PrimaryNav({ active, items, notificationCount, profileHref }: PrimaryNavProps) {
  const pathname = usePathname();
  const committedActive = getActiveFromPathname(pathname, profileHref) ?? active;

  return (
    <nav className="primary-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = committedActive === item.key;
        const className = `nav-link ${item.disabled ? "nav-link-disabled" : ""} ${isActive ? "active" : ""}`.trim();

        const content = (
          <>
            <span className="nav-link-main">
              <NavIcon icon={item.icon} />
              <span>{item.label}</span>
            </span>
            {item.key === "notifications" && notificationCount > 0 ? (
              <span className="nav-count">{notificationCount}</span>
            ) : null}
          </>
        );

        if (item.disabled) {
          return (
            <span aria-disabled="true" aria-current={isActive ? "page" : undefined} className={className} key={item.key}>
              {content}
            </span>
          );
        }

        return (
          <Link aria-current={isActive ? "page" : undefined} className={className} href={item.href} key={item.key}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

function getActiveFromPathname(pathname: string | null, profileHref: string): PrimaryNavKey | undefined {
  if (!pathname) {
    return undefined;
  }

  if (pathname === "/" || pathname === "/home") {
    return "home";
  }

  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return "messages";
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return "notifications";
  }

  if (profileHref !== "/" && (pathname === profileHref || pathname.startsWith(`${profileHref}/`))) {
    return "profile";
  }

  if (pathname.startsWith("/u/")) {
    return "profile";
  }

  if (pathname === "/onboarding") {
    return "profile";
  }

  return undefined;
}

function NavIcon({ icon }: { icon: PrimaryNavKey }) {
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
