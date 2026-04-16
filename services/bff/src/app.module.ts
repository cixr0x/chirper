import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AccountController } from "./account.controller";
import { GraphController } from "./graph.controller";
import { GraphClientService } from "./clients/graph.client";
import { FeedController } from "./feed.controller";
import { HealthController } from "./health.controller";
import { MediaController } from "./media.controller";
import { NotificationsController } from "./notifications.controller";
import { SessionController } from "./session.controller";
import { SessionAuthService } from "./session-auth.service";
import { UsersController } from "./users.controller";
import { IdentityClientService } from "./clients/identity.client";
import { MediaClientService } from "./clients/media.client";
import { NotificationsClientService } from "./clients/notifications.client";
import { PostsClientService } from "./clients/posts.client";
import { ProfileClientService } from "./clients/profile.client";
import { ProfileController } from "./profile.controller";
import { RealtimeClientService } from "./clients/realtime.client";
import { TimelineClientService } from "./clients/timeline.client";
import { UserSummaryService } from "./user-summary.service";
import {
  graphProtoPath,
  identityProtoPath,
  mediaProtoPath,
  notificationsProtoPath,
  postsProtoPath,
  profileProtoPath,
  realtimeProtoPath,
  timelineProtoPath,
} from "./proto-paths";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: "IDENTITY_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "identity.v1",
          protoPath: identityProtoPath,
          url: process.env.IDENTITY_GRPC_URL ?? "127.0.0.1:50051",
        },
      },
      {
        name: "PROFILE_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "profile.v1",
          protoPath: profileProtoPath,
          url: process.env.PROFILE_GRPC_URL ?? "127.0.0.1:50052",
        },
      },
      {
        name: "POSTS_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "posts.v1",
          protoPath: postsProtoPath,
          url: process.env.POSTS_GRPC_URL ?? "127.0.0.1:50053",
        },
      },
      {
        name: "GRAPH_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "graph.v1",
          protoPath: graphProtoPath,
          url: process.env.GRAPH_GRPC_URL ?? "127.0.0.1:50054",
        },
      },
      {
        name: "TIMELINE_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "timeline.v1",
          protoPath: timelineProtoPath,
          url: process.env.TIMELINE_GRPC_URL ?? "127.0.0.1:50055",
        },
      },
      {
        name: "NOTIFICATIONS_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "notifications.v1",
          protoPath: notificationsProtoPath,
          url: process.env.NOTIFICATIONS_GRPC_URL ?? "127.0.0.1:50056",
        },
      },
      {
        name: "MEDIA_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "media.v1",
          protoPath: mediaProtoPath,
          url: process.env.MEDIA_GRPC_URL ?? "127.0.0.1:50058",
        },
      },
      {
        name: "REALTIME_PACKAGE",
        transport: Transport.GRPC,
        options: {
          package: "realtime.v1",
          protoPath: realtimeProtoPath,
          url: process.env.REALTIME_GRPC_URL ?? "127.0.0.1:50057",
        },
      },
    ]),
  ],
  controllers: [
    HealthController,
    UsersController,
    SessionController,
    AccountController,
    ProfileController,
    FeedController,
    GraphController,
    NotificationsController,
    MediaController,
  ],
  providers: [
    IdentityClientService,
    ProfileClientService,
    PostsClientService,
    GraphClientService,
    TimelineClientService,
    NotificationsClientService,
    MediaClientService,
    RealtimeClientService,
    SessionAuthService,
    UserSummaryService,
  ],
})
export class AppModule {}
