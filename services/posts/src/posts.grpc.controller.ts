import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { PostsService } from "./posts.service";

@Controller()
export class PostsGrpcController {
  constructor(private readonly posts: PostsService) {}

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

  @GrpcMethod("PostsService", "GetPostsByIds")
  async getPostsByIds(data: { postIds?: string[] }) {
    const posts = await this.posts.getPostsByIds(data.postIds ?? []);
    return { posts };
  }

  @GrpcMethod("PostsService", "CreatePost")
  async createPost(data: { authorUserId: string; body: string; visibility?: string }) {
    return this.posts.createPost(data);
  }
}
