import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import {
  type ConversationListItem,
  type ConversationRecord,
  type MessageRecord,
  MessagesService,
} from "./messages.service";

type ListConversationsRequest = {
  viewerUserId: string;
  limit?: number;
  cursor?: string;
};

type GetConversationRequest = {
  viewerUserId: string;
  conversationId: string;
  limit?: number;
  beforeCursor?: string;
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

@Controller()
export class MessagesGrpcController {
  constructor(@Inject(MessagesService) private readonly messages: MessagesService) {}

  @GrpcMethod("MessagesService", "ListConversations")
  async listConversations(request: ListConversationsRequest) {
    const result = await this.messages.listConversations({
      viewerUserId: request.viewerUserId,
      limit: request.limit || 20,
      ...(request.cursor ? { cursor: request.cursor } : {}),
    });

    return {
      conversations: result.conversations.map((conversation) =>
        mapConversation(conversation, request.viewerUserId),
      ),
      nextCursor: result.nextCursor ?? "",
    };
  }

  @GrpcMethod("MessagesService", "GetConversation")
  async getConversation(request: GetConversationRequest) {
    const result = await this.messages.getConversation({
      viewerUserId: request.viewerUserId,
      conversationId: request.conversationId,
      limit: request.limit || 30,
      ...(request.beforeCursor ? { beforeCursor: request.beforeCursor } : {}),
    });

    return {
      conversation: mapConversation(result.conversation, request.viewerUserId),
      messages: result.messages.map(mapMessage),
      nextCursor: result.nextCursor ?? "",
    };
  }

  @GrpcMethod("MessagesService", "StartConversation")
  async startConversation(request: StartConversationRequest) {
    const conversation = await this.messages.startConversation({
      viewerUserId: request.viewerUserId,
      recipientUserId: request.recipientUserId,
    });

    return mapConversation(conversation, request.viewerUserId, request.recipientUserId);
  }

  @GrpcMethod("MessagesService", "SendMessage")
  async sendMessage(request: SendMessageRequest) {
    const message = await this.messages.sendMessage({
      viewerUserId: request.viewerUserId,
      conversationId: request.conversationId,
      body: request.body,
    });

    return mapMessage(message);
  }

  @GrpcMethod("MessagesService", "MarkConversationRead")
  markConversationRead(request: MarkConversationReadRequest) {
    return this.messages.markConversationRead({
      viewerUserId: request.viewerUserId,
      conversationId: request.conversationId,
    });
  }
}

function mapConversation(
  conversation: ConversationRecord | ConversationListItem,
  viewerUserId?: string,
  fallbackOtherUserId?: string,
) {
  return {
    conversationId: conversation.id,
    participantUserIds: conversation.participantUserIds ?? [],
    otherUserId: findOtherUserId(conversation.participantUserIds ?? [], viewerUserId) || fallbackOtherUserId || "",
    lastMessageId: conversation.lastMessageId ?? "",
    lastMessagePreview: conversation.lastMessagePreview ?? "",
    lastMessageAuthorUserId: conversation.lastMessageAuthorUserId ?? "",
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? "",
    unreadCount: "unreadCount" in conversation ? conversation.unreadCount : 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function mapMessage(message: MessageRecord) {
  return {
    messageId: message.id,
    conversationId: message.conversationId,
    authorUserId: message.authorUserId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
  };
}

function findOtherUserId(participantUserIds: string[], viewerUserId?: string) {
  if (!viewerUserId) {
    return "";
  }

  return participantUserIds.find((userId) => userId !== viewerUserId) ?? "";
}
