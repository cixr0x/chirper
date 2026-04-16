import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type PostRecord = {
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: string;
  inReplyToPostId: string;
};

export type TimelineActivityRecord = {
  activityId: string;
  activityType: string;
  actorUserId: string;
  sourcePostId: string;
  createdAt: string;
};

type ListPostsByAuthorsRequest = {
  authorUserIds: string[];
  limit: number;
};

type ListPostsByAuthorsResponse = {
  posts: PostRecord[];
};

type ListTimelineActivitiesByUsersRequest = {
  actorUserIds: string[];
  limit: number;
};

type ListTimelineActivitiesByUsersResponse = {
  activities: TimelineActivityRecord[];
};

type PostsGrpcService = {
  listPostsByAuthors(request: ListPostsByAuthorsRequest): Observable<ListPostsByAuthorsResponse>;
  listTimelineActivitiesByUsers(
    request: ListTimelineActivitiesByUsersRequest,
  ): Observable<ListTimelineActivitiesByUsersResponse>;
};

@Injectable()
export class PostsClientService implements OnModuleInit {
  private service!: PostsGrpcService;

  constructor(@Inject("POSTS_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<PostsGrpcService>("PostsService");
  }

  async listPostsByAuthors(authorUserIds: string[], limit = 25) {
    const response = await lastValueFrom(this.service.listPostsByAuthors({ authorUserIds, limit }));
    return response.posts ?? [];
  }

  async listTimelineActivitiesByUsers(actorUserIds: string[], limit = 25) {
    const response = await lastValueFrom(
      this.service.listTimelineActivitiesByUsers({ actorUserIds, limit }),
    );
    return response.activities ?? [];
  }
}
