import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { status } from "@grpc/grpc-js";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { MessagesController } from "./messages.controller";

class FakeMessagesClient {
  calls: unknown[] = [];
  startConversationError?: unknown;

  async listConversations(viewerUserId: string, limit: number, cursor?: string) {
    this.calls.push({ method: "listConversations", viewerUserId, limit, cursor });
    return {
      conversations: [
        {
          conversationId: "msgc_1",
          participantUserIds: ["user_viewer", "user_other"],
          otherUserId: "user_other",
          lastMessagePreview: "hello",
          unreadCount: 2,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:01.000Z",
        },
      ],
      nextCursor: "cursor_2",
    };
  }

  async getConversation(viewerUserId: string, conversationId: string, limit: number, beforeCursor?: string) {
    this.calls.push({ method: "getConversation", viewerUserId, conversationId, limit, beforeCursor });
    return {
      conversation: {
        conversationId,
        participantUserIds: ["user_viewer", "user_other"],
        otherUserId: "user_other",
        lastMessagePreview: "reply",
        unreadCount: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:03.000Z",
      },
      messages: [
        {
          messageId: "msgm_1",
          conversationId,
          authorUserId: "user_other",
          body: "reply",
          createdAt: "2026-01-01T00:00:02.000Z",
        },
        {
          messageId: "msgm_2",
          conversationId,
          authorUserId: "user_viewer",
          body: "mine",
          createdAt: "2026-01-01T00:00:03.000Z",
        },
      ],
      nextCursor: "",
    };
  }

  async startConversation(viewerUserId: string, recipientUserId: string) {
    this.calls.push({ method: "startConversation", viewerUserId, recipientUserId });
    if (this.startConversationError) {
      throw this.startConversationError;
    }

    return {
      conversationId: "msgc_new",
      participantUserIds: [viewerUserId, recipientUserId],
      otherUserId: recipientUserId,
      lastMessagePreview: "",
      unreadCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
  }

  async sendMessage(viewerUserId: string, conversationId: string, body: string) {
    this.calls.push({ method: "sendMessage", viewerUserId, conversationId, body });
    return {
      messageId: "msgm_new",
      conversationId,
      authorUserId: viewerUserId,
      body,
      createdAt: "2026-01-01T00:00:04.000Z",
    };
  }

  async markConversationRead(viewerUserId: string, conversationId: string) {
    this.calls.push({ method: "markConversationRead", viewerUserId, conversationId });
    return { updated: true };
  }
}

class FakeSessionAuth {
  calls: unknown[] = [];

  async requireSession(sessionToken?: string) {
    this.calls.push(sessionToken);
    if (!sessionToken) {
      throw new UnauthorizedException("Session required.");
    }
    return { userId: "user_viewer" };
  }
}

class FakeUserSummaryService {
  calls: string[] = [];

  async getUserSummaryById(userId: string) {
    this.calls.push(userId);
    return {
      userId,
      handle: userId.replace("user_", ""),
      displayName: `Display ${userId}`,
      avatarUrl: `https://cdn.example.com/${userId}.png`,
    };
  }
}

function createController() {
  const messagesClient = new FakeMessagesClient();
  const sessionAuth = new FakeSessionAuth();
  const userSummaryService = new FakeUserSummaryService();
  const controller = new MessagesController(messagesClient as never, sessionAuth as never, userSummaryService as never);
  return { controller, messagesClient, sessionAuth, userSummaryService };
}

test("listConversations requires a session, uses the session viewer, clamps limit, and enriches otherUser", async () => {
  const { controller, messagesClient, sessionAuth, userSummaryService } = createController();

  await assert.rejects(() => controller.listConversations("999", undefined, undefined), UnauthorizedException);

  const result = await controller.listConversations("999", " cursor_1 ", "session_1");

  assert.deepEqual(sessionAuth.calls, [undefined, "session_1"]);
  assert.deepEqual(messagesClient.calls, [
    { method: "listConversations", viewerUserId: "user_viewer", limit: 50, cursor: "cursor_1" },
  ]);
  assert.deepEqual(userSummaryService.calls, ["user_other"]);
  assert.equal(result.nextCursor, "cursor_2");
  assert.equal(result.conversations[0]?.otherUser?.userId, "user_other");
});

test("listConversations treats a blank limit query as missing and uses the default", async () => {
  const { controller, messagesClient } = createController();

  await controller.listConversations("   ", undefined, "session_1");

  assert.deepEqual(messagesClient.calls, [
    { method: "listConversations", viewerUserId: "user_viewer", limit: 20, cursor: undefined },
  ]);
});

test("listConversations treats array limit and cursor query values as missing", async () => {
  const { controller, messagesClient } = createController();

  await controller.listConversations(["25"] as never, ["cursor_1"] as never, "session_1");

  assert.deepEqual(messagesClient.calls, [
    { method: "listConversations", viewerUserId: "user_viewer", limit: 20, cursor: undefined },
  ]);
});

test("getConversation enriches the conversation other user and every message author summary", async () => {
  const { controller, messagesClient, userSummaryService } = createController();

  const result = await controller.getConversation("msgc_1", "500", " msgm_before ", "session_1");

  assert.deepEqual(messagesClient.calls, [
    {
      method: "getConversation",
      viewerUserId: "user_viewer",
      conversationId: "msgc_1",
      limit: 100,
      beforeCursor: "msgm_before",
    },
  ]);
  assert.deepEqual(userSummaryService.calls, ["user_other", "user_other", "user_viewer"]);
  assert.equal(result.conversation.otherUser.userId, "user_other");
  assert.deepEqual(
    result.messages.map((message) => message.author.userId),
    ["user_other", "user_viewer"],
  );
});

test("getConversation treats array limit and beforeCursor query values as missing", async () => {
  const { controller, messagesClient } = createController();

  await controller.getConversation("msgc_1", ["50"] as never, ["msgm_before"] as never, "session_1");

  assert.deepEqual(messagesClient.calls, [
    {
      method: "getConversation",
      viewerUserId: "user_viewer",
      conversationId: "msgc_1",
      limit: 30,
      beforeCursor: undefined,
    },
  ]);
});

test("startConversation accepts a missing request body without crashing", async () => {
  const { controller, messagesClient } = createController();

  await controller.startConversation("session_1", undefined as never);

  assert.deepEqual(messagesClient.calls, [
    { method: "startConversation", viewerUserId: "user_viewer", recipientUserId: "" },
  ]);
});

test("startConversation treats a non-string recipientUserId as empty without throwing TypeError", async () => {
  const { controller, messagesClient } = createController();

  await controller.startConversation("session_1", { recipientUserId: 123 } as never);

  assert.deepEqual(messagesClient.calls, [
    { method: "startConversation", viewerUserId: "user_viewer", recipientUserId: "" },
  ]);
});

test("startConversation maps gRPC invalid argument errors to stable HTTP bad requests", async () => {
  const { controller, messagesClient } = createController();
  messagesClient.startConversationError = Object.assign(new Error("Cannot start a conversation with yourself"), {
    code: status.INVALID_ARGUMENT,
    details: "Cannot start a conversation with yourself",
  });

  await assert.rejects(
    () => controller.startConversation("session_1", { recipientUserId: "user_viewer" }),
    BadRequestException,
  );
});

test("sendMessage accepts a missing request body without crashing", async () => {
  const { controller, messagesClient } = createController();

  const message = await controller.sendMessage("msgc_1", "session_1", undefined as never);

  assert.equal(message.author.userId, "user_viewer");
  assert.deepEqual(messagesClient.calls, [
    { method: "sendMessage", viewerUserId: "user_viewer", conversationId: "msgc_1", body: "" },
  ]);
});

test("sendMessage treats a non-string body field as empty without throwing TypeError", async () => {
  const { controller, messagesClient } = createController();

  const message = await controller.sendMessage("msgc_1", "session_1", { body: ["hello"] } as never);

  assert.equal(message.author.userId, "user_viewer");
  assert.deepEqual(messagesClient.calls, [
    { method: "sendMessage", viewerUserId: "user_viewer", conversationId: "msgc_1", body: "" },
  ]);
});

test("start, send, and read use the session viewer id instead of any submitted viewer id", async () => {
  const { controller, messagesClient } = createController();

  const conversation = await controller.startConversation("session_1", {
    viewerUserId: "user_attacker",
    recipientUserId: "user_other",
  } as never);
  const message = await controller.sendMessage("msgc_1", "session_1", {
    viewerUserId: "user_attacker",
    body: "hello",
  } as never);
  const read = await controller.markConversationRead("msgc_1", "session_1");

  assert.equal(conversation.otherUser.userId, "user_other");
  assert.equal(message.author.userId, "user_viewer");
  assert.deepEqual(read, { updated: true });
  assert.deepEqual(messagesClient.calls, [
    { method: "startConversation", viewerUserId: "user_viewer", recipientUserId: "user_other" },
    { method: "sendMessage", viewerUserId: "user_viewer", conversationId: "msgc_1", body: "hello" },
    { method: "markConversationRead", viewerUserId: "user_viewer", conversationId: "msgc_1" },
  ]);
});
