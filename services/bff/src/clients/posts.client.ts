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

export type PostMetrics = {
  postId: string;
  replyCount: number;
  likeCount: number;
  repostCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};

export type PostInteractionRecord = {
  interactionId: string;
  postId: string;
  userId: string;
  createdAt: string;
  changed: boolean;
};

export type PostEngagementRecord = {
  interactionId: string;
  postId: string;
  userId: string;
  createdAt: string;
};

export type PostInteractionRemovalResult = {
  removed: boolean;
};

export type TimelineActivityRecord = {
  activityId: string;
  activityType: string;
  actorUserId: string;
  sourcePostId: string;
  createdAt: string;
};

type ListPublicPostsRequest = { limit: number };
type ListPublicPostsResponse = {
  posts: PostRecord[];
};
type ListPostsByAuthorsRequest = {
  authorUserIds: string[];
  limit: number;
};
type ListPostsByAuthorsResponse = {
  posts: PostRecord[];
};
type ListRepliesRequest = {
  postId: string;
  limit: number;
};
type ListRepliesResponse = {
  posts: PostRecord[];
};
type ListPostEngagementRequest = {
  postId: string;
  limit: number;
};
type ListPostEngagementResponse = {
  records: PostEngagementRecord[];
};
type ListTimelineActivitiesByUsersRequest = {
  actorUserIds: string[];
  limit: number;
};
type ListTimelineActivitiesByUsersResponse = {
  activities: TimelineActivityRecord[];
};
type GetPostsByIdsRequest = {
  postIds: string[];
};
type GetPostsByIdsResponse = {
  posts: PostRecord[];
};
type GetPostMetricsRequest = {
  postIds: string[];
  viewerUserId?: string;
};
type GetPostMetricsResponse = {
  metrics: PostMetrics[];
};
type CreatePostRequest = {
  authorUserId: string;
  body: string;
  visibility?: string;
};
type CreateReplyRequest = {
  authorUserId: string;
  inReplyToPostId: string;
  body: string;
  visibility?: string;
};
type PostInteractionRequest = {
  userId: string;
  postId: string;
};

type PostsGrpcService = {
  listPublicPosts(request: ListPublicPostsRequest): Observable<ListPublicPostsResponse>;
  listPostsByAuthors(request: ListPostsByAuthorsRequest): Observable<ListPostsByAuthorsResponse>;
  listReplies(request: ListRepliesRequest): Observable<ListRepliesResponse>;
  listLikes(request: ListPostEngagementRequest): Observable<ListPostEngagementResponse>;
  listReposts(request: ListPostEngagementRequest): Observable<ListPostEngagementResponse>;
  listTimelineActivitiesByUsers(
    request: ListTimelineActivitiesByUsersRequest,
  ): Observable<ListTimelineActivitiesByUsersResponse>;
  getPostsByIds(request: GetPostsByIdsRequest): Observable<GetPostsByIdsResponse>;
  getPostMetrics(request: GetPostMetricsRequest): Observable<GetPostMetricsResponse>;
  createPost(request: CreatePostRequest): Observable<PostRecord>;
  createReply(request: CreateReplyRequest): Observable<PostRecord>;
  createLike(request: PostInteractionRequest): Observable<PostInteractionRecord>;
  removeLike(request: PostInteractionRequest): Observable<PostInteractionRemovalResult>;
  createRepost(request: PostInteractionRequest): Observable<PostInteractionRecord>;
  removeRepost(request: PostInteractionRequest): Observable<PostInteractionRemovalResult>;
};

@Injectable()
export class PostsClientService implements OnModuleInit {
  private service!: PostsGrpcService;

  constructor(@Inject("POSTS_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<PostsGrpcService>("PostsService");
  }

  async listPublicPosts(limit = 25) {
    const response = await lastValueFrom(this.service.listPublicPosts({ limit }));
    return response.posts ?? [];
  }

  async listPostsByAuthors(authorUserIds: string[], limit = 25) {
    const response = await lastValueFrom(this.service.listPostsByAuthors({ authorUserIds, limit }));
    return response.posts ?? [];
  }

  async listReplies(postId: string, limit = 25) {
    const response = await lastValueFrom(this.service.listReplies({ postId, limit }));
    return response.posts ?? [];
  }

  async listLikes(postId: string, limit = 25) {
    const response = await lastValueFrom(this.service.listLikes({ postId, limit }));
    return response.records ?? [];
  }

  async listReposts(postId: string, limit = 25) {
    const response = await lastValueFrom(this.service.listReposts({ postId, limit }));
    return response.records ?? [];
  }

  async listTimelineActivitiesByUsers(actorUserIds: string[], limit = 25) {
    const response = await lastValueFrom(
      this.service.listTimelineActivitiesByUsers({
        actorUserIds,
        limit,
      }),
    );
    return response.activities ?? [];
  }

  async getPostsByIds(postIds: string[]) {
    const response = await lastValueFrom(this.service.getPostsByIds({ postIds }));
    return response.posts ?? [];
  }

  async getPostMetrics(postIds: string[], viewerUserId?: string) {
    const response = await lastValueFrom(
      this.service.getPostMetrics({
        postIds,
        ...(viewerUserId ? { viewerUserId } : {}),
      }),
    );
    return response.metrics ?? [];
  }

  createPost(request: CreatePostRequest) {
    return lastValueFrom(this.service.createPost(request));
  }

  createReply(request: CreateReplyRequest) {
    return lastValueFrom(this.service.createReply(request));
  }

  createLike(request: PostInteractionRequest) {
    return lastValueFrom(this.service.createLike(request));
  }

  removeLike(request: PostInteractionRequest) {
    return lastValueFrom(this.service.removeLike(request));
  }

  createRepost(request: PostInteractionRequest) {
    return lastValueFrom(this.service.createRepost(request));
  }

  removeRepost(request: PostInteractionRequest) {
    return lastValueFrom(this.service.removeRepost(request));
  }
}
