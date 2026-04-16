export type UserSummary = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
  bio: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  links: {
    label: string;
    url: string;
  }[];
};

export type FeedItem = {
  postId: string;
  body: string;
  visibility: string;
  createdAt: string;
  projectedAt?: string;
  author?: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  };
};

export type NotificationItem = {
  notificationId: string;
  type: string;
  resourceId: string;
  isRead: boolean;
  createdAt: string;
  summary: string;
  actor?: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  };
};

export type NotificationEnvelope = {
  unreadCount: number;
  notifications: NotificationItem[];
};

export type RealtimeEventEnvelope = {
  nextSequence: number;
  events: NotificationItem[];
};

export type SessionEnvelope = {
  sessionId: string;
  expiresAt: string;
  createdAt: string;
  viewer: UserSummary;
};

const bffBaseUrl = process.env.NEXT_PUBLIC_BFF_URL ?? "http://127.0.0.1:4000";

function sessionHeaders(sessionToken?: string): HeadersInit {
  if (!sessionToken) {
    return {};
  }

  return {
    "x-chirper-session-token": sessionToken,
  };
}

export async function getUserDirectory(): Promise<UserSummary[]> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/users`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as UserSummary[];
  } catch {
    return [];
  }
}

export async function getUserByHandle(handle: string): Promise<UserSummary | null> {
  try {
    const response = await fetch(
      `${bffBaseUrl}/api/users/by-handle/${encodeURIComponent(handle)}/summary`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UserSummary;
  } catch {
    return null;
  }
}

export async function getUserById(userId: string): Promise<UserSummary | null> {
  try {
    const response = await fetch(
      `${bffBaseUrl}/api/users/${encodeURIComponent(userId)}/summary`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UserSummary;
  } catch {
    return null;
  }
}

export async function getPublicFeed(): Promise<FeedItem[]> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/feed`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as FeedItem[];
  } catch {
    return [];
  }
}

export async function getHomeFeed(sessionToken: string): Promise<FeedItem[]> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/feed`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as FeedItem[];
  } catch {
    return [];
  }
}

export async function getViewerFollowingUserIds(sessionToken: string): Promise<string[]> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/graph/viewer/following`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { userIds: string[] };
    return payload.userIds;
  } catch {
    return [];
  }
}

export async function getNotifications(sessionToken: string): Promise<NotificationEnvelope> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/notifications`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return {
        unreadCount: 0,
        notifications: [],
      };
    }

    return (await response.json()) as NotificationEnvelope;
  } catch {
    return {
      unreadCount: 0,
      notifications: [],
    };
  }
}

export async function getRealtimeEvents(
  sessionToken: string,
  afterSequence: number,
  limit = 12,
): Promise<RealtimeEventEnvelope> {
  try {
    const response = await fetch(
      `${bffBaseUrl}/api/realtime/events?afterSequence=${encodeURIComponent(String(afterSequence))}&limit=${encodeURIComponent(String(limit))}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return {
        nextSequence: afterSequence,
        events: [],
      };
    }

    return (await response.json()) as RealtimeEventEnvelope;
  } catch {
    return {
      nextSequence: afterSequence,
      events: [],
    };
  }
}

export async function getCurrentSession(sessionToken: string): Promise<SessionEnvelope | null> {
  try {
    const response = await fetch(`${bffBaseUrl}/api/session`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SessionEnvelope;
  } catch {
    return null;
  }
}

export function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatPostTimestamp(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
