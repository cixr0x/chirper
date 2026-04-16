export const DOMAIN_EVENTS = {
  identityUserCreated: "identity.user.created.v1",
  profileUpdated: "profile.profile.updated.v1",
  graphFollowCreated: "graph.follow.created.v1",
  postPublished: "posts.post.published.v1",
  timelineEntryProjected: "timeline.entry.projected.v1",
  notificationCreated: "notifications.notification.created.v1",
  mediaAssetProcessed: "media.asset.processed.v1",
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

export const KAFKA_TOPICS = {
  postsEvents: "chirper.posts.events.v1",
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
