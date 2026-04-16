import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { PostsService } from "./posts.service";

@Controller()
export class PostsGrpcController {
  constructor(@Inject(PostsService) private readonly posts: PostsService) {}

  @GrpcMethod("PostsService", "ListPublicPosts")
  async listPublicPosts(data: { limit?: number }) {
    const posts = await this.posts.listPublicPosts(data.limit ?? 25);
    return { posts };
  }

  @GrpcMethod("PostsService", "ListPostsByAuthors")
  async listPostsByAuthors(data: { authorUserIds?: string[]; limit?: number }) {
    const posts = await this.posts.listPostsByAuthors(data.authorUserIds ?? [], data.limit ?? 25);
    return { posts };
  }

  @GrpcMethod("PostsService", "ListReplies")
  async listReplies(data: { postId: string; limit?: number }) {
    return {
      posts: await this.posts.listReplies(data.postId, data.limit ?? 25),
    };
  }

  @GrpcMethod("PostsService", "ListTimelineActivitiesByUsers")
  async listTimelineActivitiesByUsers(data: { actorUserIds?: string[]; limit?: number }) {
    return {
      activities: await this.posts.listTimelineActivitiesByUsers(data.actorUserIds ?? [], data.limit ?? 25),
    };
  }

  @GrpcMethod("PostsService", "GetPostsByIds")
  async getPostsByIds(data: { postIds?: string[] }) {
    const posts = await this.posts.getPostsByIds(data.postIds ?? []);
    return { posts };
  }

  @GrpcMethod("PostsService", "GetPostMetrics")
  async getPostMetrics(data: { postIds?: string[]; viewerUserId?: string }) {
    return {
      metrics: await this.posts.getPostMetrics(data.postIds ?? [], data.viewerUserId?.trim() || undefined),
    };
  }

  @GrpcMethod("PostsService", "CreatePost")
  async createPost(data: { authorUserId: string; body: string; visibility?: string }) {
    return this.posts.createPost(data);
  }

  @GrpcMethod("PostsService", "CreateReply")
  async createReply(data: {
    authorUserId: string;
    inReplyToPostId: string;
    body: string;
    visibility?: string;
  }) {
    return this.posts.createReply(data);
  }

  @GrpcMethod("PostsService", "CreateLike")
  async createLike(data: { userId: string; postId: string }) {
    return this.posts.createLike(data);
  }

  @GrpcMethod("PostsService", "RemoveLike")
  async removeLike(data: { userId: string; postId: string }) {
    return this.posts.removeLike(data);
  }

  @GrpcMethod("PostsService", "CreateRepost")
  async createRepost(data: { userId: string; postId: string }) {
    return this.posts.createRepost(data);
  }

  @GrpcMethod("PostsService", "RemoveRepost")
  async removeRepost(data: { userId: string; postId: string }) {
    return this.posts.removeRepost(data);
  }
}
