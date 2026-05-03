import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { status } from "@grpc/grpc-js";
import { BadRequestException } from "@nestjs/common";
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

test("startConversation maps expected policy validation errors to gRPC INVALID_ARGUMENT", async () => {
  const service = {
    startConversation: async () => {
      throw new BadRequestException("Cannot start a conversation with yourself");
    },
  };
  const controller = new MessagesGrpcController(service as never);

  await assert.rejects(
    () => controller.startConversation({ viewerUserId: "user_1", recipientUserId: "user_1" }),
    (error) => {
      const rpcError = (error as { getError?: () => unknown }).getError?.();
      assert.equal(typeof rpcError, "object");
      assert.equal((rpcError as { code?: number }).code, status.INVALID_ARGUMENT);
      assert.equal((rpcError as { message?: string }).message, "Cannot start a conversation with yourself");
      return true;
    },
  );
});
