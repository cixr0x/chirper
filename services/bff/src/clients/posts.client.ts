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
  mediaAssetIds: string[];
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

type ListPublicPostsRequest = { limit: number; cursor?: string };
type ListPublicPostsResponse = {
  posts: PostRecord[];
  nextCursor?: string;
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
  cursor?: string;
};
type ListRepliesResponse = {
  posts: PostRecord[];
  nextCursor?: string;
};
type ListPostEngagementRequest = {
  postId: string;
  limit: number;
  cursor?: string;
};
type ListPostEngagementResponse = {
  records: PostEngagementRecord[];
  nextCursor?: string;
};
type ListTimelineActivitiesByUsersRequest = {
  actorUserIds: string[];
  limit: number;
  cursor?: string;
};
type ListTimelineActivitiesByUsersResponse = {
  activities: TimelineActivityRecord[];
  nextCursor?: string;
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
  mediaAssetIds?: string[];
};
type CreateReplyRequest = {
  authorUserId: string;
  inReplyToPostId: string;
  body: string;
  visibility?: string;
  mediaAssetIds?: string[];
};
type PostInteractionRequest = {
  userId: string;
  postId: string;
};
type DeletePostRequest = {
  authorUserId: string;
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
  deletePost(request: DeletePostRequest): Observable<PostInteractionRemovalResult>;
};

@Injectable()
export class PostsClientService implements OnModuleInit {
  private service!: PostsGrpcService;

  constructor(@Inject("POSTS_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<PostsGrpcService>("PostsService");
  }

  async listPublicPosts(limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listPublicPosts({
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      posts: response.posts ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async listPostsByAuthors(authorUserIds: string[], limit = 25) {
    const response = await lastValueFrom(this.service.listPostsByAuthors({ authorUserIds, limit }));
    return response.posts ?? [];
  }

  async listReplies(postId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listReplies({
        postId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      posts: response.posts ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async listLikes(postId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listLikes({
        postId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      records: response.records ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async listReposts(postId: string, limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listReposts({
        postId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      records: response.records ?? [],
      nextCursor: response.nextCursor ?? "",
    };
  }

  async listTimelineActivitiesByUsers(actorUserIds: string[], limit = 25, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listTimelineActivitiesByUsers({
        actorUserIds,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    return {
      activities: response.activities ?? [],
      nextCursor: response.nextCursor ?? "",
    };
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

  deletePost(request: DeletePostRequest) {
    return lastValueFrom(this.service.deletePost(request));
  }
}
