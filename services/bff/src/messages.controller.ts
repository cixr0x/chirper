import { status } from "@grpc/grpc-js";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  type ConversationRecord,
  type MessageRecord,
  MessagesClientService,
} from "./clients/messages.client";
import { sessionHeaderName } from "./session-header";
import { SessionAuthService } from "./session-auth.service";
import { UserSummaryService } from "./user-summary.service";
import { getGrpcErrorMessage, hasGrpcStatus } from "./grpc-status";

type UserSummary = Awaited<ReturnType<UserSummaryService["getUserSummaryById"]>>;

@Controller("messages")
export class MessagesController {
  constructor(
    @Inject(MessagesClientService) private readonly messagesClient: MessagesClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
    @Inject(UserSummaryService) private readonly userSummaryService: UserSummaryService,
  ) {}

  @Get("conversations")
  async listConversations(
    @Query("limit") limit?: unknown,
    @Query("cursor") cursor?: unknown,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const result = await mapMessagesGrpcError(() =>
      this.messagesClient.listConversations(
        session.userId,
        clampLimit(limit, 20, 1, 50),
        normalizeOptional(cursor),
      ),
    );

    return {
      conversations: await Promise.all(result.conversations.map((conversation) => this.enrichConversation(conversation))),
      nextCursor: result.nextCursor,
    };
  }

  @Post("conversations")
  async startConversation(
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body() body?: { recipientUserId?: unknown },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const conversation = await mapMessagesGrpcError(() =>
      this.messagesClient.startConversation(session.userId, stringValue(body?.recipientUserId)),
    );
    return this.enrichConversation(conversation);
  }

  @Get("conversations/:conversationId")
  async getConversation(
    @Param("conversationId") conversationId: string,
    @Query("limit") limit?: unknown,
    @Query("beforeCursor") beforeCursor?: unknown,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const result = await mapMessagesGrpcError(() =>
      this.messagesClient.getConversation(
        session.userId,
        conversationId,
        clampLimit(limit, 30, 1, 100),
        normalizeOptional(beforeCursor),
      ),
    );
    const [conversation, authorMap] = await Promise.all([
      this.enrichConversation(result.conversation),
      this.buildAuthorMap(result.messages.map((message) => message.authorUserId)),
    ]);

    return {
      conversation,
      messages: result.messages.map((message) => this.enrichMessage(message, authorMap)),
      nextCursor: result.nextCursor,
    };
  }

  @Post("conversations/:conversationId/messages")
  async sendMessage(
    @Param("conversationId") conversationId: string,
    @Headers(sessionHeaderName) sessionToken: string | undefined,
    @Body() body?: { body?: unknown },
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    const message = await mapMessagesGrpcError(() =>
      this.messagesClient.sendMessage(session.userId, conversationId, stringValue(body?.body)),
    );
    const author = await this.userSummaryService.getUserSummaryById(message.authorUserId);
    return { ...message, author };
  }

  @Post("conversations/:conversationId/read")
  async markConversationRead(
    @Param("conversationId") conversationId: string,
    @Headers(sessionHeaderName) sessionToken?: string,
  ) {
    const session = await this.sessionAuth.requireSession(sessionToken);
    return mapMessagesGrpcError(() => this.messagesClient.markConversationRead(session.userId, conversationId));
  }

  private async enrichConversation(conversation: ConversationRecord) {
    return {
      ...conversation,
      otherUser: await this.userSummaryService.getUserSummaryById(conversation.otherUserId),
    };
  }

  private async buildAuthorMap(authorUserIds: string[]) {
    const entries = await Promise.all(
      [...new Set(authorUserIds)].map(async (authorUserId) => [
        authorUserId,
        await this.userSummaryService.getUserSummaryById(authorUserId),
      ] as const),
    );

    return new Map(entries);
  }

  private enrichMessage(message: MessageRecord, authorMap: Map<string, UserSummary>) {
    return {
      ...message,
      author: authorMap.get(message.authorUserId) as UserSummary,
    };
  }
}

function clampLimit(value: unknown, fallback: number, minimum: number, maximum: number) {
  const normalized = stringValue(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function normalizeOptional(value: unknown) {
  return stringValue(value) || undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function mapMessagesGrpcError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = getGrpcErrorMessage(error, "Messages operation failed.");

    if (hasGrpcStatus(error, status.INVALID_ARGUMENT)) {
      throw new BadRequestException(message);
    }

    if (hasGrpcStatus(error, status.PERMISSION_DENIED)) {
      throw new ForbiddenException(message);
    }

    if (hasGrpcStatus(error, status.NOT_FOUND)) {
      throw new NotFoundException(message);
    }

    throw error;
  }
}
