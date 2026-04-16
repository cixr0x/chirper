import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type PostRecord = {
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
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
type GetPostsByIdsRequest = {
  postIds: string[];
};
type GetPostsByIdsResponse = {
  posts: PostRecord[];
};
type CreatePostRequest = {
  authorUserId: string;
  body: string;
  visibility?: string;
};

type PostsGrpcService = {
  listPublicPosts(request: ListPublicPostsRequest): Observable<ListPublicPostsResponse>;
  listPostsByAuthors(request: ListPostsByAuthorsRequest): Observable<ListPostsByAuthorsResponse>;
  getPostsByIds(request: GetPostsByIdsRequest): Observable<GetPostsByIdsResponse>;
  createPost(request: CreatePostRequest): Observable<PostRecord>;
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

  async getPostsByIds(postIds: string[]) {
    const response = await lastValueFrom(this.service.getPostsByIds({ postIds }));
    return response.posts ?? [];
  }

  createPost(request: CreatePostRequest) {
    return lastValueFrom(this.service.createPost(request));
  }
}
