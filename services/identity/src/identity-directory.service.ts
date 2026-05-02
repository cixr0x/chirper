import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { normalizeHandle } from "./password-utils";

type IdentityUser = {
  userId: string;
  handle: string;
  displayName: string;
  status: string;
};

@Injectable()
export class IdentityDirectoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listUsers(): Promise<IdentityUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ displayName: "asc" }],
    });

    return users.map((user) => ({
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      status: "active",
    }));
  }

  async searchUsers(query: string, limit: number): Promise<IdentityUser[]> {
    const normalizedQuery = normalizeHandle(query);
    if (normalizedQuery.length < 2) {
      return [];
    }

    const resultLimit = Math.min(Math.max(Math.trunc(limit) || 5, 1), 10);
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { handle: { contains: normalizedQuery } },
          { displayName: { contains: query.trim() } },
        ],
      },
      orderBy: [{ handle: "asc" }],
      take: 50,
    });

    return users
      .filter((user) => matchesUser(user.handle, user.displayName, normalizedQuery))
      .sort((left, right) => compareUserSearchResults(left, right, normalizedQuery))
      .slice(0, resultLimit)
      .map((user) => ({
        userId: user.id,
        handle: user.handle,
        displayName: user.displayName,
        status: "active",
      }));
  }

  async getUserById(userId: string): Promise<IdentityUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      status: "active",
    };
  }

  async getUserByHandle(handle: string): Promise<IdentityUser | null> {
    const normalizedHandle = normalizeHandle(handle);
    const user = await this.prisma.user.findUnique({
      where: { handle: normalizedHandle },
    });

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      handle: user.handle,
      displayName: user.displayName,
      status: "active",
    };
  }
}

function matchesUser(handle: string, displayName: string, query: string) {
  return handle.toLowerCase().includes(query) || displayName.toLowerCase().includes(query);
}

function compareUserSearchResults(
  left: { handle: string; displayName: string },
  right: { handle: string; displayName: string },
  query: string,
) {
  const leftRank = getSearchRank(left, query);
  const rightRank = getSearchRank(right, query);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.handle.localeCompare(right.handle);
}

function getSearchRank(user: { handle: string; displayName: string }, query: string) {
  const handle = user.handle.toLowerCase();
  const displayName = user.displayName.toLowerCase();

  if (handle === query) {
    return 0;
  }
  if (handle.startsWith(query)) {
    return 1;
  }
  if (displayName.startsWith(query)) {
    return 2;
  }
  return 3;
}
