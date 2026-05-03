import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Conversation, Message, Prisma } from "../generated/prisma";
import { GraphClientService } from "./clients/graph.client";
import { IdentityClientService } from "./clients/identity.client";
import { ProfileClientService } from "./clients/profile.client";
import { PrismaService } from "./prisma.service";

export type ConversationRecord = {
  id: string;
  participantLowUserId: string;
  participantHighUserId: string;
  participantUserIds: string[];
  lastMessageId: string | null;
  lastMessagePreview: string;
  lastMessageAuthorUserId: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationListItem = ConversationRecord & {
  unreadCount: number;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
};

export type ListConversationsResult = {
  conversations: ConversationListItem[];
  nextCursor: string | null;
};

export type GetConversationResult = {
  conversation: ConversationRecord;
  messages: MessageRecord[];
  nextCursor: string | null;
};

type PrismaTransaction = Omit<
  PrismaService,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MESSAGE_PREVIEW_LENGTH = 180;
const MESSAGE_BODY_LENGTH = 2000;

@Injectable()
export class MessagesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly identityClient: IdentityClientService,
    private readonly profileClient: ProfileClientService,
    private readonly graphClient: GraphClientService,
  ) {}

  async startConversation(input: { viewerUserId: string; recipientUserId: string }): Promise<ConversationRecord> {
    const viewerUserId = normalizeUserId(input.viewerUserId);
    const recipientUserId = normalizeUserId(input.recipientUserId);

    if (!viewerUserId || !recipientUserId) {
      throw new BadRequestException("viewerUserId and recipientUserId are required");
    }
    if (viewerUserId === recipientUserId) {
      throw new BadRequestException("Cannot start a conversation with yourself");
    }

    const recipient = await this.identityClient.getUserById(recipientUserId);
    if (!recipient) {
      throw new NotFoundException("Recipient not found");
    }

    const profile = await this.profileClient.getProfileByUserId(recipientUserId);
    if (profile.allowDirectInbox === false) {
      throw new ForbiddenException("Recipient direct inbox is disabled");
    }

    if (await this.graphClient.hasBlockBetween(viewerUserId, recipientUserId)) {
      throw new ForbiddenException("Direct messages are not allowed for this pair");
    }

    const [participantLowUserId, participantHighUserId] = canonicalParticipants(viewerUserId, recipientUserId);
    const existing = await this.prisma.conversation.findFirst({
      where: { participantLowUserId, participantHighUserId },
    });

    if (existing) {
      return mapConversation(existing);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        id: createId("msgc"),
        participantLowUserId,
        participantHighUserId,
      },
    });

    return mapConversation(conversation);
  }

  async sendMessage(input: { viewerUserId: string; conversationId: string; body: string }): Promise<MessageRecord> {
    const viewerUserId = normalizeUserId(input.viewerUserId);
    const conversationId = normalizeId(input.conversationId);
    const body = input.body.trim();

    if (!viewerUserId || !conversationId) {
      throw new BadRequestException("viewerUserId and conversationId are required");
    }
    if (!body) {
      throw new BadRequestException("Message body is required");
    }
    if (body.length > MESSAGE_BODY_LENGTH) {
      throw new BadRequestException("Message body must be 2000 characters or fewer");
    }

    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertParticipant(conversation, viewerUserId);

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          id: createId("msgm"),
          conversationId,
          authorUserId: viewerUserId,
          body,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: message.id,
          lastMessagePreview: makePreview(body),
          lastMessageAuthorUserId: viewerUserId,
          lastMessageAt: message.createdAt,
        },
      });

      return mapMessage(message);
    });
  }

  async listConversations(input: { viewerUserId: string; limit?: number; cursor?: string }): Promise<ListConversationsResult> {
    const viewerUserId = normalizeUserId(input.viewerUserId);
    if (!viewerUserId) {
      throw new BadRequestException("viewerUserId is required");
    }

    const limit = normalizeLimit(input.limit);
    const conversations = await this.prisma.conversation.findMany({
      where: participantWhere(viewerUserId),
    });

    const ordered = conversations.sort(compareConversationActivity);
    const cursorIndex = input.cursor ? ordered.findIndex((conversation) => conversation.id === input.cursor) : -1;
    const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const page = ordered.slice(startIndex, startIndex + limit);
    const hasMore = ordered.length > startIndex + limit;

    const mapped = await Promise.all(
      page.map(async (conversation) => ({
        ...mapConversation(conversation),
        unreadCount: await this.countUnread(conversation.id, viewerUserId),
      })),
    );

    return {
      conversations: mapped,
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    };
  }

  async getConversation(input: {
    viewerUserId: string;
    conversationId: string;
    limit?: number;
    beforeCursor?: string;
  }): Promise<GetConversationResult> {
    const viewerUserId = normalizeUserId(input.viewerUserId);
    const conversationId = normalizeId(input.conversationId);
    if (!viewerUserId || !conversationId) {
      throw new BadRequestException("viewerUserId and conversationId are required");
    }

    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertParticipant(conversation, viewerUserId);

    const limit = normalizeLimit(input.limit);
    const cursorMessage = input.beforeCursor
      ? await this.prisma.message.findFirst({
          where: { id: input.beforeCursor, conversationId },
        })
      : null;

    if (input.beforeCursor && !cursorMessage) {
      throw new BadRequestException("beforeCursor is invalid");
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
      ...(cursorMessage ? olderThanMessageWhere(cursorMessage) : {}),
    };
    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();

    return {
      conversation: mapConversation(conversation),
      messages: page.map(mapMessage),
      nextCursor: hasMore ? page[0]?.id ?? null : null,
    };
  }

  async markConversationRead(input: { viewerUserId: string; conversationId: string }): Promise<{ updated: true }> {
    const viewerUserId = normalizeUserId(input.viewerUserId);
    const conversationId = normalizeId(input.conversationId);
    if (!viewerUserId || !conversationId) {
      throw new BadRequestException("viewerUserId and conversationId are required");
    }

    const conversation = await this.findConversationOrThrow(conversationId);
    this.assertParticipant(conversation, viewerUserId);

    const newestMessage = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const lastReadAt = newestMessage?.createdAt ?? new Date();

    await this.prisma.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: viewerUserId,
        },
      },
      create: {
        id: createId("msgcr"),
        conversationId,
        userId: viewerUserId,
        lastReadMessageId: newestMessage?.id ?? null,
        lastReadAt,
      },
      update: {
        lastReadMessageId: newestMessage?.id ?? null,
        lastReadAt,
      },
    });

    return { updated: true };
  }

  private async findConversationOrThrow(conversationId: string, prisma: PrismaTransaction = this.prisma) {
    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    return conversation;
  }

  private assertParticipant(conversation: Conversation, viewerUserId: string) {
    if (conversation.participantLowUserId !== viewerUserId && conversation.participantHighUserId !== viewerUserId) {
      throw new ForbiddenException("Viewer is not a conversation participant");
    }
  }

  private async countUnread(conversationId: string, viewerUserId: string) {
    const read = await this.prisma.conversationRead.findFirst({
      where: { conversationId, userId: viewerUserId },
    });
    return this.prisma.message.count({
      where: {
        conversationId,
        authorUserId: { not: viewerUserId },
        ...(read?.lastReadAt ? { createdAt: { gt: read.lastReadAt } } : {}),
      },
    });
  }
}

function normalizeUserId(userId: string) {
  return userId.trim();
}

function normalizeId(id: string) {
  return id.trim();
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException("limit must be a positive integer");
  }
  return Math.min(limit, MAX_LIMIT);
}

function canonicalParticipants(userIdA: string, userIdB: string): [string, string] {
  return [userIdA, userIdB].sort() as [string, string];
}

function participantWhere(viewerUserId: string): Prisma.ConversationWhereInput {
  return {
    OR: [{ participantLowUserId: viewerUserId }, { participantHighUserId: viewerUserId }],
  };
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function makePreview(body: string) {
  return body.slice(0, MESSAGE_PREVIEW_LENGTH);
}

function mapConversation(conversation: Conversation): ConversationRecord {
  return {
    id: conversation.id,
    participantLowUserId: conversation.participantLowUserId,
    participantHighUserId: conversation.participantHighUserId,
    participantUserIds: [conversation.participantLowUserId, conversation.participantHighUserId],
    lastMessageId: conversation.lastMessageId,
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAuthorUserId: conversation.lastMessageAuthorUserId,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function mapMessage(message: Message): MessageRecord {
  return {
    id: message.id,
    conversationId: message.conversationId,
    authorUserId: message.authorUserId,
    body: message.body,
    createdAt: message.createdAt,
  };
}

function compareConversationActivity(left: Conversation, right: Conversation) {
  const leftAt = (left.lastMessageAt ?? left.updatedAt).getTime();
  const rightAt = (right.lastMessageAt ?? right.updatedAt).getTime();
  if (leftAt !== rightAt) {
    return rightAt - leftAt;
  }
  return right.id.localeCompare(left.id);
}

function olderThanMessageWhere(message: Message): Prisma.MessageWhereInput {
  return {
    OR: [
      { createdAt: { lt: message.createdAt } },
      {
        createdAt: message.createdAt,
        id: { lt: message.id },
      },
    ],
  };
}
