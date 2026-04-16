import { Inject, Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { PrismaService } from "./prisma.service";

type IdentitySessionRecord = {
  sessionId: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

const sessionLifetimeDays = 14;
const sessionTouchWindowMs = 1000 * 60 * 5;

@Injectable()
export class IdentitySessionService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createSession(userId: string, _userAgent?: string): Promise<IdentitySessionRecord & { sessionToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error(`Identity user ${userId} was not found`);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionLifetimeDays * 24 * 60 * 60 * 1000);
    const sessionId = `sess_${randomBytes(16).toString("hex")}`;
    const sessionToken = `st_${randomBytes(32).toString("base64url")}`;
    const sessionTokenHash = hashSessionToken(sessionToken);

    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        sessionTokenHash,
        expiresAt,
        createdAt: now,
        lastSeenAt: now,
      },
    });

    return {
      sessionToken,
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  async getSession(sessionToken: string): Promise<IdentitySessionRecord | null> {
    const normalizedToken = sessionToken.trim();
    if (!normalizedToken) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: hashSessionToken(normalizedToken) },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() >= sessionTouchWindowMs) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  async revokeSession(sessionToken: string) {
    const normalizedToken = sessionToken.trim();
    if (!normalizedToken) {
      return { revoked: false };
    }

    const existingSession = await this.prisma.session.findUnique({
      where: { sessionTokenHash: hashSessionToken(normalizedToken) },
      select: { id: true, revokedAt: true },
    });

    if (!existingSession || existingSession.revokedAt) {
      return { revoked: false };
    }

    await this.prisma.session.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    return { revoked: true };
  }

  async revokeAllSessionsForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

function hashSessionToken(sessionToken: string) {
  return createHash("sha256").update(sessionToken).digest("hex");
}
