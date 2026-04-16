import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { IdentityPasswordError } from "./identity-password.error";
import { IdentitySessionService } from "./identity-session.service";
import {
  hashPassword,
  normalizeDisplayName,
  normalizeHandle,
  normalizePassword,
  validateDisplayName,
  validateHandle,
  validatePassword,
  verifyPassword,
} from "./password-utils";

const passwordResetLifetimeMinutes = 30;

@Injectable()
export class IdentityPasswordService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentitySessionService) private readonly sessions: IdentitySessionService,
  ) {}

  async createPasswordSession(handle: string, password: string, userAgent?: string) {
    const normalizedHandle = normalizeHandle(handle);
    const normalizedPassword = normalizePassword(password);

    if (!normalizedHandle || !normalizedPassword) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { handle: normalizedHandle },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const credential = await this.prisma.credential.findFirst({
      where: {
        userId: user.id,
        provider: "password",
      },
      orderBy: { createdAt: "desc" },
    });

    const matches = await verifyPassword(normalizedPassword, credential?.passwordHash ?? null);
    if (!matches) {
      return null;
    }

    return this.sessions.createSession(user.id, userAgent);
  }

  async registerPasswordUser(
    handle: string,
    displayName: string,
    password: string,
    userAgent?: string,
  ) {
    const normalizedHandle = normalizeHandle(handle);
    const normalizedDisplayName = normalizeDisplayName(displayName);
    const normalizedPassword = normalizePassword(password);

    const handleError = validateHandle(normalizedHandle);
    if (handleError) {
      throw new IdentityPasswordError("invalid_argument", handleError);
    }

    const displayNameError = validateDisplayName(normalizedDisplayName);
    if (displayNameError) {
      throw new IdentityPasswordError("invalid_argument", displayNameError);
    }

    const passwordError = validatePassword(normalizedPassword);
    if (passwordError) {
      throw new IdentityPasswordError("invalid_argument", passwordError);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { handle: normalizedHandle },
      select: { id: true },
    });

    if (existingUser) {
      throw new IdentityPasswordError("already_exists", `Handle @${normalizedHandle} is already taken.`);
    }

    const userId = `usr_${randomBytes(16).toString("hex")}`;
    const credentialId = `cred_${randomBytes(16).toString("hex")}`;
    const passwordHash = await hashPassword(normalizedPassword);

    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          id: userId,
          handle: normalizedHandle,
          displayName: normalizedDisplayName,
        },
      }),
      this.prisma.credential.create({
        data: {
          id: credentialId,
          userId,
          provider: "password",
          passwordHash,
        },
      }),
    ]);

    return this.sessions.createSession(userId, userAgent);
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string) {
    const normalizedCurrentPassword = normalizePassword(currentPassword);
    const normalizedNextPassword = normalizePassword(nextPassword);

    const nextPasswordError = validatePassword(normalizedNextPassword);
    if (nextPasswordError) {
      throw new IdentityPasswordError("invalid_argument", nextPasswordError);
    }

    if (!normalizedCurrentPassword) {
      throw new IdentityPasswordError("invalid_argument", "Current password is required.");
    }

    const credential = await this.prisma.credential.findFirst({
      where: {
        userId,
        provider: "password",
      },
      orderBy: { createdAt: "desc" },
    });

    const matches = await verifyPassword(normalizedCurrentPassword, credential?.passwordHash ?? null);
    if (!credential || !matches) {
      throw new IdentityPasswordError("failed_precondition", "Current password is incorrect.");
    }

    if (await verifyPassword(normalizedNextPassword, credential.passwordHash)) {
      throw new IdentityPasswordError(
        "invalid_argument",
        "Choose a new password that differs from the current one.",
      );
    }

    await this.prisma.credential.update({
      where: { id: credential.id },
      data: {
        passwordHash: await hashPassword(normalizedNextPassword),
      },
    });

    return { updated: true };
  }

  async createPasswordReset(handle: string) {
    const normalizedHandle = normalizeHandle(handle);
    const handleError = validateHandle(normalizedHandle);
    if (handleError) {
      throw new IdentityPasswordError("invalid_argument", handleError);
    }

    const user = await this.prisma.user.findUnique({
      where: { handle: normalizedHandle },
      select: { id: true },
    });

    if (!user) {
      return { accepted: true };
    }

    const credential = await this.prisma.credential.findFirst({
      where: {
        userId: user.id,
        provider: "password",
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (!credential) {
      return { accepted: true };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + passwordResetLifetimeMinutes * 60 * 1000);
    const resetId = `preset_${randomBytes(16).toString("hex")}`;
    const previewToken = `prt_${randomBytes(24).toString("base64url")}`;
    const resetTokenHash = hashOpaqueToken(previewToken);

    await this.prisma.$transaction([
      this.prisma.passwordReset.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          consumedAt: now,
        },
      }),
      this.prisma.passwordReset.create({
        data: {
          id: resetId,
          userId: user.id,
          resetTokenHash,
          expiresAt,
        },
      }),
    ]);

    return {
      accepted: true,
      previewToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async resetPassword(resetToken: string, newPassword: string, userAgent?: string) {
    const normalizedResetToken = resetToken.trim();
    const normalizedPassword = normalizePassword(newPassword);

    if (!normalizedResetToken) {
      throw new IdentityPasswordError("invalid_argument", "Reset token is required.");
    }

    const passwordError = validatePassword(normalizedPassword);
    if (passwordError) {
      throw new IdentityPasswordError("invalid_argument", passwordError);
    }

    const now = new Date();
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: {
        resetTokenHash: hashOpaqueToken(normalizedResetToken),
      },
    });

    if (
      !passwordReset ||
      passwordReset.consumedAt ||
      passwordReset.expiresAt.getTime() <= now.getTime()
    ) {
      throw new IdentityPasswordError("unauthenticated", "Valid password reset token required.");
    }

    const credential = await this.prisma.credential.findFirst({
      where: {
        userId: passwordReset.userId,
        provider: "password",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!credential) {
      throw new IdentityPasswordError(
        "failed_precondition",
        "Password resets require an existing password credential.",
      );
    }

    await this.prisma.$transaction([
      this.prisma.credential.update({
        where: { id: credential.id },
        data: {
          passwordHash: await hashPassword(normalizedPassword),
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: {
          consumedAt: now,
        },
      }),
    ]);

    await this.sessions.revokeAllSessionsForUser(passwordReset.userId);
    return this.sessions.createSession(passwordReset.userId, userAgent);
  }
}

function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
