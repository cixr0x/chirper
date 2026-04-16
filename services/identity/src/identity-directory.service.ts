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
