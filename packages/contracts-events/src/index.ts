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

export type DomainEventEnvelope<TPayload> = {
  id: string;
  name: DomainEventName;
  aggregateId: string;
  occurredAt: string;
  payload: TPayload;
};

