export const DOMAIN_EVENTS = {
  identityUserCreated: "identity.user.created.v1",
  profileUpdated: "profile.profile.updated.v1",
  graphFollowCreated: "graph.follow.created.v1",
  graphFollowRemoved: "graph.follow.removed.v1",
  postPublished: "posts.post.published.v1",
  postDeleted: "posts.post.deleted.v1",
  postLikeCreated: "posts.like.created.v1",
  postLikeRemoved: "posts.like.removed.v1",
  postRepostCreated: "posts.repost.created.v1",
  postRepostRemoved: "posts.repost.removed.v1",
  timelineEntryProjected: "timeline.entry.projected.v1",
  notificationCreated: "notifications.notification.created.v1",
  mediaAssetProcessed: "media.asset.processed.v1",
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export const KAFKA_TOPICS = {
  postsEvents: "chirper.posts.events.v1",
  graphEvents: "chirper.graph.events.v1",
} as const;

export type KafkaTopicName = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export type DomainEventEnvelope<TPayload, TName extends DomainEventName = DomainEventName> = {
  id: string;
  name: TName;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
};

export type PostPublishedPayload = {
  postId: string;
  authorUserId: string;
  visibility: string;
  createdAt: string;
  inReplyToPostId?: string;
  inReplyToAuthorUserId?: string;
};

export type PostPublishedEvent = DomainEventEnvelope<
  PostPublishedPayload,
  (typeof DOMAIN_EVENTS)["postPublished"]
>;

export type PostDeletedPayload = {
  postId: string;
  authorUserId: string;
  deletedAt: string;
  mediaAssetIds: string[];
};

export type PostDeletedEvent = DomainEventEnvelope<
  PostDeletedPayload,
  (typeof DOMAIN_EVENTS)["postDeleted"]
>;

export type PostLikeCreatedPayload = {
  likeId: string;
  postId: string;
  actorUserId: string;
  postAuthorUserId: string;
  createdAt: string;
};

export type PostLikeCreatedEvent = DomainEventEnvelope<
  PostLikeCreatedPayload,
  (typeof DOMAIN_EVENTS)["postLikeCreated"]
>;

export type PostLikeRemovedPayload = {
  likeId: string;
  postId: string;
  actorUserId: string;
  postAuthorUserId: string;
  removedAt: string;
};

export type PostLikeRemovedEvent = DomainEventEnvelope<
  PostLikeRemovedPayload,
  (typeof DOMAIN_EVENTS)["postLikeRemoved"]
>;

export type PostRepostCreatedPayload = {
  repostId: string;
  postId: string;
  actorUserId: string;
  postAuthorUserId: string;
  createdAt: string;
};

export type PostRepostCreatedEvent = DomainEventEnvelope<
  PostRepostCreatedPayload,
  (typeof DOMAIN_EVENTS)["postRepostCreated"]
>;

export type PostRepostRemovedPayload = {
  repostId: string;
  postId: string;
  actorUserId: string;
  postAuthorUserId: string;
  removedAt: string;
};

export type PostRepostRemovedEvent = DomainEventEnvelope<
  PostRepostRemovedPayload,
  (typeof DOMAIN_EVENTS)["postRepostRemoved"]
>;

export type GraphFollowCreatedPayload = {
  followId: string;
  followerUserId: string;
  followeeUserId: string;
  createdAt: string;
};

export type GraphFollowCreatedEvent = DomainEventEnvelope<
  GraphFollowCreatedPayload,
  (typeof DOMAIN_EVENTS)["graphFollowCreated"]
>;

export type GraphFollowRemovedPayload = {
  followerUserId: string;
  followeeUserId: string;
  removedAt: string;
};

export type GraphFollowRemovedEvent = DomainEventEnvelope<
  GraphFollowRemovedPayload,
  (typeof DOMAIN_EVENTS)["graphFollowRemoved"]
>;

export function isPostPublishedEvent(value: unknown): value is PostPublishedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostPublishedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postPublished &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.authorUserId === "string" &&
    typeof event.payload?.visibility === "string" &&
    typeof event.payload?.createdAt === "string" &&
    (event.payload?.inReplyToPostId === undefined || typeof event.payload?.inReplyToPostId === "string") &&
    (event.payload?.inReplyToAuthorUserId === undefined ||
      typeof event.payload?.inReplyToAuthorUserId === "string")
  );
}

export function isPostDeletedEvent(value: unknown): value is PostDeletedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostDeletedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postDeleted &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.authorUserId === "string" &&
    typeof event.payload?.deletedAt === "string" &&
    Array.isArray(event.payload?.mediaAssetIds) &&
    event.payload.mediaAssetIds.every((assetId) => typeof assetId === "string")
  );
}

export function isPostLikeCreatedEvent(value: unknown): value is PostLikeCreatedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostLikeCreatedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postLikeCreated &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.likeId === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.actorUserId === "string" &&
    typeof event.payload?.postAuthorUserId === "string" &&
    typeof event.payload?.createdAt === "string"
  );
}

export function isPostLikeRemovedEvent(value: unknown): value is PostLikeRemovedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostLikeRemovedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postLikeRemoved &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.likeId === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.actorUserId === "string" &&
    typeof event.payload?.postAuthorUserId === "string" &&
    typeof event.payload?.removedAt === "string"
  );
}

export function isPostRepostCreatedEvent(value: unknown): value is PostRepostCreatedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostRepostCreatedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postRepostCreated &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.repostId === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.actorUserId === "string" &&
    typeof event.payload?.postAuthorUserId === "string" &&
    typeof event.payload?.createdAt === "string"
  );
}

export function isPostRepostRemovedEvent(value: unknown): value is PostRepostRemovedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<PostRepostRemovedEvent>;
  return (
    event.name === DOMAIN_EVENTS.postRepostRemoved &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.repostId === "string" &&
    typeof event.payload?.postId === "string" &&
    typeof event.payload?.actorUserId === "string" &&
    typeof event.payload?.postAuthorUserId === "string" &&
    typeof event.payload?.removedAt === "string"
  );
}

export function isGraphFollowCreatedEvent(value: unknown): value is GraphFollowCreatedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<GraphFollowCreatedEvent>;
  return (
    event.name === DOMAIN_EVENTS.graphFollowCreated &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.followId === "string" &&
    typeof event.payload?.followerUserId === "string" &&
    typeof event.payload?.followeeUserId === "string" &&
    typeof event.payload?.createdAt === "string"
  );
}

export function isGraphFollowRemovedEvent(value: unknown): value is GraphFollowRemovedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Partial<GraphFollowRemovedEvent>;
  return (
    event.name === DOMAIN_EVENTS.graphFollowRemoved &&
    typeof event.id === "string" &&
    typeof event.aggregateId === "string" &&
    typeof event.occurredAt === "string" &&
    typeof event.payload?.followerUserId === "string" &&
    typeof event.payload?.followeeUserId === "string" &&
    typeof event.payload?.removedAt === "string"
  );
}
