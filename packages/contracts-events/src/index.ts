export const DOMAIN_EVENTS = {
  identityUserCreated: "identity.user.created.v1",
  profileUpdated: "profile.profile.updated.v1",
  graphFollowCreated: "graph.follow.created.v1",
  graphFollowRemoved: "graph.follow.removed.v1",
  postPublished: "posts.post.published.v1",
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
};

export type PostPublishedEvent = DomainEventEnvelope<
  PostPublishedPayload,
  (typeof DOMAIN_EVENTS)["postPublished"]
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
    typeof event.payload?.createdAt === "string"
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
