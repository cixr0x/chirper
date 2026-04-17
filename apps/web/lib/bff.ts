export type UserSummary = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
  bio: string;
  location: string;
  avatarAssetId: string;
  bannerAssetId: string;
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
  activityType: string;
  author?: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  };
  actor?: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  };
  inReplyTo?: {
    postId: string;
    author?: {
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string;
    };
  };
  media: {
    assetId: string;
    url: string;
    mimeType: string;
    purpose: string;
    status: string;
  }[];
  metrics: {
    postId: string;
    replyCount: number;
    likeCount: number;
    repostCount: number;
    likedByViewer: boolean;
    repostedByViewer: boolean;
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
  nextCursor: string;
};

export type ThreadEnvelope = {
  focus: FeedItem | null;
  ancestors: FeedItem[];
  replies: FeedItem[];
  nextReplyCursor: string;
};

export type EngagementActor = {
  interactionId: string;
  createdAt: string;
  actor: {
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
  };
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

export type RelationshipUser = UserSummary & {
  isViewer: boolean;
  isFollowedByViewer: boolean;
};

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string;
};

export type EngagementPage = {
  items: EngagementActor[];
  nextCursor: string;
};

export type RelationshipPage = {
  items: RelationshipUser[];
  totalCount: number;
  nextCursor: string;
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

function withPagination(pathname: string, limit?: number, cursor?: string) {
  const params = new URLSearchParams();
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  if (cursor) {
    params.set("cursor", cursor);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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

export async function getPublicFeed(limit = 12, cursor?: string): Promise<FeedPage> {
  try {
    const response = await fetch(`${bffBaseUrl}${withPagination("/api/feed", limit, cursor)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { items: [], nextCursor: "" };
    }

    return (await response.json()) as FeedPage;
  } catch {
    return { items: [], nextCursor: "" };
  }
}

export async function getHomeFeed(sessionToken: string, limit = 12, cursor?: string): Promise<FeedPage> {
  try {
    const response = await fetch(`${bffBaseUrl}${withPagination("/api/feed", limit, cursor)}`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return { items: [], nextCursor: "" };
    }

    return (await response.json()) as FeedPage;
  } catch {
    return { items: [], nextCursor: "" };
  }
}

export async function getUserFeed(
  userId: string,
  sessionToken?: string,
  limit = 12,
  cursor?: string,
): Promise<FeedPage> {
  try {
    const response = await fetch(
      `${bffBaseUrl}${withPagination(`/api/users/${encodeURIComponent(userId)}/feed`, limit, cursor)}`,
      {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return { items: [], nextCursor: "" };
    }

    return (await response.json()) as FeedPage;
  } catch {
    return { items: [], nextCursor: "" };
  }
}

export async function getPostThread(
  postId: string,
  sessionToken?: string,
  replyLimit = 8,
  replyCursor?: string,
): Promise<ThreadEnvelope | null> {
  try {
    const params = new URLSearchParams();
    params.set("replyLimit", String(replyLimit));
    if (replyCursor) {
      params.set("replyCursor", replyCursor);
    }
    const query = params.toString();
    const response = await fetch(
      `${bffBaseUrl}/api/posts/${encodeURIComponent(postId)}/thread${query ? `?${query}` : ""}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ThreadEnvelope;
  } catch {
    return null;
  }
}

export async function getPostLikes(
  postId: string,
  sessionToken?: string,
  limit = 8,
  cursor?: string,
): Promise<EngagementPage> {
  try {
    const response = await fetch(
      `${bffBaseUrl}${withPagination(`/api/posts/${encodeURIComponent(postId)}/likes`, limit, cursor)}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return { items: [], nextCursor: "" };
    }

    return (await response.json()) as EngagementPage;
  } catch {
    return { items: [], nextCursor: "" };
  }
}

export async function getPostReposts(
  postId: string,
  sessionToken?: string,
  limit = 8,
  cursor?: string,
): Promise<EngagementPage> {
  try {
    const response = await fetch(
      `${bffBaseUrl}${withPagination(`/api/posts/${encodeURIComponent(postId)}/reposts`, limit, cursor)}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return { items: [], nextCursor: "" };
    }

    return (await response.json()) as EngagementPage;
  } catch {
    return { items: [], nextCursor: "" };
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

export async function getFollowers(
  userId: string,
  sessionToken?: string,
  limit = 12,
  cursor?: string,
): Promise<RelationshipPage> {
  try {
    const response = await fetch(
      `${bffBaseUrl}${withPagination(`/api/users/${encodeURIComponent(userId)}/followers`, limit, cursor)}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return { items: [], totalCount: 0, nextCursor: "" };
    }

    return (await response.json()) as RelationshipPage;
  } catch {
    return { items: [], totalCount: 0, nextCursor: "" };
  }
}

export async function getFollowing(
  userId: string,
  sessionToken?: string,
  limit = 12,
  cursor?: string,
): Promise<RelationshipPage> {
  try {
    const response = await fetch(
      `${bffBaseUrl}${withPagination(`/api/users/${encodeURIComponent(userId)}/following`, limit, cursor)}`,
      {
        cache: "no-store",
        headers: sessionHeaders(sessionToken),
      },
    );

    if (!response.ok) {
      return { items: [], totalCount: 0, nextCursor: "" };
    }

    return (await response.json()) as RelationshipPage;
  } catch {
    return { items: [], totalCount: 0, nextCursor: "" };
  }
}

export async function getNotifications(sessionToken: string, limit = 8, cursor?: string): Promise<NotificationEnvelope> {
  try {
    const response = await fetch(`${bffBaseUrl}${withPagination("/api/notifications", limit, cursor)}`, {
      cache: "no-store",
      headers: sessionHeaders(sessionToken),
    });

    if (!response.ok) {
      return {
        unreadCount: 0,
        notifications: [],
        nextCursor: "",
      };
    }

    return (await response.json()) as NotificationEnvelope;
  } catch {
    return {
      unreadCount: 0,
      notifications: [],
      nextCursor: "",
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
