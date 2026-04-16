import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "./prisma.service";

type PostRecord = {
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: string;
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPosts(limit = 25): Promise<PostRecord[]> {
    const posts = await this.prisma.post.findMany({
      where: { visibility: "public" },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return posts.map((post) => ({
      postId: post.id,
      authorUserId: post.authorId,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  async listPostsByAuthors(authorUserIds: string[], limit = 25): Promise<PostRecord[]> {
    const uniqueAuthorIds = [...new Set(authorUserIds.map((value) => value.trim()).filter(Boolean))];
    if (uniqueAuthorIds.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: uniqueAuthorIds },
        visibility: "public",
      },
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 100),
    });

    return posts.map((post) => ({
      postId: post.id,
      authorUserId: post.authorId,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  async getPostsByIds(postIds: string[]): Promise<PostRecord[]> {
    const uniquePostIds = [...new Set(postIds.map((value) => value.trim()).filter(Boolean))];
    if (uniquePostIds.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: uniquePostIds },
      },
    });

    const postMap = new Map(
      posts.map((post) => [
        post.id,
        {
          postId: post.id,
          authorUserId: post.authorId,
          body: post.body,
          visibility: post.visibility,
          createdAt: post.createdAt.toISOString(),
        } satisfies PostRecord,
      ]),
    );

    return uniquePostIds.map((postId) => postMap.get(postId)).filter((post): post is PostRecord => Boolean(post));
  }

  async createPost(input: {
    authorUserId: string;
    body: string;
    visibility?: string;
  }): Promise<PostRecord> {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException("Post body cannot be empty.");
    }

    if (body.length > 280) {
      throw new BadRequestException("Post body cannot exceed 280 characters.");
    }

    const visibility = input.visibility?.trim() || "public";
    const post = await this.prisma.post.create({
      data: {
        id: `post_${randomUUID().replace(/-/g, "")}`,
        authorId: input.authorUserId,
        body,
        visibility,
      },
    });

    return {
      postId: post.id,
      authorUserId: post.authorId,
      body: post.body,
      visibility: post.visibility,
      createdAt: post.createdAt.toISOString(),
    };
  }
}
