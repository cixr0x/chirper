import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { MessagesGrpcController } from "./messages.grpc.controller";

test("listConversations preserves last-message metadata in the gRPC DTO", async () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const service = {
    listConversations: async () => ({
      conversations: [
        {
          id: "msgc_1",
          participantLowUserId: "user_other",
          participantHighUserId: "user_viewer",
          participantUserIds: ["user_other", "user_viewer"],
          lastMessageId: "msgm_1",
          lastMessageSequence: 10n,
          lastMessagePreview: "hello",
          lastMessageAuthorUserId: "user_other",
          lastMessageAt: now,
          unreadCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
      nextCursor: null,
    }),
  };
  const controller = new MessagesGrpcController(service as never);

  const result = await controller.listConversations({ viewerUserId: "user_viewer" });

  assert.equal(result.conversations[0]?.lastMessageId, "msgm_1");
  assert.equal(result.conversations[0]?.lastMessageAuthorUserId, "user_other");
});
