import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, lastValueFrom } from "rxjs";

export type ConversationRecord = {
  conversationId: string;
  participantUserIds: string[];
  otherUserId: string;
  lastMessageId: string;
  lastMessagePreview: string;
  lastMessageAuthorUserId: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  messageId: string;
  conversationId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

type ListConversationsRequest = {
  viewerUserId: string;
  limit: number;
  cursor?: string;
};
type ListConversationsResponse = {
  conversations?: ConversationRecord[];
  nextCursor?: string;
};
type GetConversationRequest = {
  viewerUserId: string;
  conversationId: string;
  limit: number;
  beforeCursor?: string;
};
type GetConversationResponse = {
  conversation?: ConversationRecord;
  messages?: MessageRecord[];
  nextCursor?: string;
};
type StartConversationRequest = {
  viewerUserId: string;
  recipientUserId: string;
};
type SendMessageRequest = {
  viewerUserId: string;
  conversationId: string;
  body: string;
};
type MarkConversationReadRequest = {
  viewerUserId: string;
  conversationId: string;
};
type MarkConversationReadResponse = {
  updated?: boolean;
};

type MessagesGrpcService = {
  listConversations(request: ListConversationsRequest): Observable<ListConversationsResponse>;
  getConversation(request: GetConversationRequest): Observable<GetConversationResponse>;
  startConversation(request: StartConversationRequest): Observable<ConversationRecord>;
  sendMessage(request: SendMessageRequest): Observable<MessageRecord>;
  markConversationRead(request: MarkConversationReadRequest): Observable<MarkConversationReadResponse>;
};

@Injectable()
export class MessagesClientService implements OnModuleInit {
  private service!: MessagesGrpcService;

  constructor(@Inject("MESSAGES_PACKAGE") private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.service = this.client.getService<MessagesGrpcService>("MessagesService");
  }

  async listConversations(viewerUserId: string, limit = 20, cursor?: string) {
    const response = await lastValueFrom(
      this.service.listConversations({
        viewerUserId,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );

    return {
      conversations: (response.conversations ?? []).map(normalizeConversation),
      nextCursor: response.nextCursor ?? "",
    };
  }

  async getConversation(viewerUserId: string, conversationId: string, limit = 30, beforeCursor?: string) {
    const response = await lastValueFrom(
      this.service.getConversation({
        viewerUserId,
        conversationId,
        limit,
        ...(beforeCursor ? { beforeCursor } : {}),
      }),
    );

    return {
      conversation: normalizeConversation(response.conversation),
      messages: (response.messages ?? []).map(normalizeMessage),
      nextCursor: response.nextCursor ?? "",
    };
  }

  async startConversation(viewerUserId: string, recipientUserId: string) {
    const response = await lastValueFrom(this.service.startConversation({ viewerUserId, recipientUserId }));
    return normalizeConversation(response);
  }

  async sendMessage(viewerUserId: string, conversationId: string, body: string) {
    const response = await lastValueFrom(this.service.sendMessage({ viewerUserId, conversationId, body }));
    return normalizeMessage(response);
  }

  async markConversationRead(viewerUserId: string, conversationId: string) {
    const response = await lastValueFrom(this.service.markConversationRead({ viewerUserId, conversationId }));
    return { updated: response.updated ?? false };
  }
}

function normalizeConversation(conversation?: Partial<ConversationRecord>): ConversationRecord {
  return {
    conversationId: conversation?.conversationId ?? "",
    participantUserIds: conversation?.participantUserIds ?? [],
    otherUserId: conversation?.otherUserId ?? "",
    lastMessageId: conversation?.lastMessageId ?? "",
    lastMessagePreview: conversation?.lastMessagePreview ?? "",
    lastMessageAuthorUserId: conversation?.lastMessageAuthorUserId ?? "",
    lastMessageAt: conversation?.lastMessageAt ?? "",
    unreadCount: conversation?.unreadCount ?? 0,
    createdAt: conversation?.createdAt ?? "",
    updatedAt: conversation?.updatedAt ?? "",
  };
}

function normalizeMessage(message?: Partial<MessageRecord>): MessageRecord {
  return {
    messageId: message?.messageId ?? "",
    conversationId: message?.conversationId ?? "",
    authorUserId: message?.authorUserId ?? "",
    body: message?.body ?? "",
    createdAt: message?.createdAt ?? "",
  };
}
