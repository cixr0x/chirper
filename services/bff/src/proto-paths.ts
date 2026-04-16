import path from "node:path";

export const identityProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/identity/v1/identity.proto",
);

export const profileProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/profile/v1/profile.proto",
);

export const postsProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/posts/v1/posts.proto",
);

export const graphProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/graph/v1/graph.proto",
);

export const timelineProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/timeline/v1/timeline.proto",
);

export const notificationsProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/notifications/v1/notifications.proto",
);

export const mediaProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/media/v1/media.proto",
);

export const realtimeProtoPath = path.resolve(
  process.cwd(),
  "../../packages/contracts-proto/proto/realtime/v1/realtime.proto",
);
