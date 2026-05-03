import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { status } from "@grpc/grpc-js";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { throwError } from "rxjs";
import { IdentityClientService } from "./clients/identity.client";
import { MessagesService } from "./messages.service";

type ConversationRow = {
  id: string;
  participantLowUserId: string;
  participantHighUserId: string;
  lastMessageId: string | null;
  lastMessagePreview: string;
  lastMessageAuthorUserId: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRow = {
  id: string;
  conversationId: string;
  authorUserId: string;
  body: string;
  createdAt: Date;
};

type ReadRow = {
  id: string;
  conversationId: string;
  userId: string;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
  updatedAt: Date;
};

class FakePrisma {
  conversations: ConversationRow[] = [];
  messages: MessageRow[] = [];
  reads: ReadRow[] = [];
  failNextConversationCreateWithP2002 = false;
  conversationToInsertBeforeP2002: ConversationRow | null = null;
  private tick = 0;

  conversation: any = {};
  message: any = {};
  conversationRead: any = {};

  constructor() {
    this.conversation = {
      findFirst: async (query: any) => this.findConversation(query.where),
      findMany: async (query: any) => this.conversations.filter((row) => matches(row, query?.where)),
      create: async (query: any) => {
        if (this.failNextConversationCreateWithP2002) {
          this.failNextConversationCreateWithP2002 = false;
          if (this.conversationToInsertBeforeP2002) {
            this.conversations.push(this.conversationToInsertBeforeP2002);
            this.conversationToInsertBeforeP2002 = null;
          }
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const now = this.nextDate();
        const row = {
          lastMessageId: null,
          lastMessagePreview: "",
          lastMessageAuthorUserId: null,
          lastMessageAt: null,
          createdAt: now,
          updatedAt: now,
          ...query.data,
        };
        this.conversations.push(row);
        return row;
      },
      update: async (query: any) => {
        const row = this.conversations.find((item) => item.id === query.where.id);
        if (!row) {
          throw new Error("conversation not found");
        }
        Object.assign(row, query.data, { updatedAt: this.nextDate() });
        return row;
      },
      updateMany: async (query: any) => {
        const rows = this.conversations.filter((row) => matches(row, query.where));
        for (const row of rows) {
          Object.assign(row, query.data, { updatedAt: this.nextDate() });
        }
        return { count: rows.length };
      },
    };

    this.message = {
      create: async (query: any) => {
        const row = { createdAt: this.nextDate(), ...query.data };
        this.messages.push(row);
        return row;
      },
      findMany: async (query: any) => {
        let rows = this.messages.filter((row) => matches(row, query?.where));
        rows = orderRows(rows, query?.orderBy);
        if (typeof query?.take === "number") {
          rows = rows.slice(0, query.take);
        }
        return rows;
      },
      findFirst: async (query: any) => {
        const rows = await (this.message as any).findMany({ ...query, take: 1 });
        return rows[0] ?? null;
      },
      count: async (query: any) => this.messages.filter((row) => matches(row, query?.where)).length,
    };

    this.conversationRead = {
      findFirst: async (query: any) => this.reads.find((row) => matches(row, query?.where)) ?? null,
      upsert: async (query: any) => {
        const existing = this.reads.find(
          (row) =>
            row.conversationId === query.where.conversationId_userId.conversationId &&
            row.userId === query.where.conversationId_userId.userId,
        );
        if (existing) {
          Object.assign(existing, query.update, { updatedAt: this.nextDate() });
          return existing;
        }
        const row = { updatedAt: this.nextDate(), ...query.create };
        this.reads.push(row);
        return row;
      },
    };
  }

  async $transaction<T>(callback: (tx: this) => Promise<T>) {
    return callback(this);
  }

  nextDate() {
    this.tick += 1;
    return new Date(`2026-01-01T00:00:${String(this.tick).padStart(2, "0")}.000Z`);
  }

  seedConversation(input: Partial<ConversationRow> & Pick<ConversationRow, "id" | "participantLowUserId" | "participantHighUserId">) {
    const now = this.nextDate();
    const row: ConversationRow = {
      lastMessageId: null,
      lastMessagePreview: "",
      lastMessageAuthorUserId: null,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.conversations.push(row);
    return row;
  }

  seedMessage(input: Omit<MessageRow, "id" | "createdAt"> & Partial<Pick<MessageRow, "id" | "createdAt">>) {
    const row: MessageRow = {
      id: `seed_${this.messages.length + 1}`,
      createdAt: this.nextDate(),
      ...input,
    };
    this.messages.push(row);
    return row;
  }

  private findConversation(where: any) {
    return this.conversations.find((row) => matches(row, where)) ?? null;
  }
}

class FakeIdentityClient {
  users = new Set(["alice", "bob", "carol", "dave"]);

  async getUserById(userId: string) {
    return this.users.has(userId) ? { userId, handle: userId, displayName: userId, status: "active" } : null;
  }
}

class FakeProfileClient {
  allowDirectInbox = new Map<string, boolean>();

  async getProfileByUserId(userId: string) {
    return { userId, allowDirectInbox: this.allowDirectInbox.get(userId) ?? true };
  }
}

class FakeGraphClient {
  blockedPairs = new Set<string>();

  async hasBlockBetween(userIdA: string, userIdB: string) {
    return this.blockedPairs.has([userIdA, userIdB].sort().join(":"));
  }
}

function createService() {
  const prisma = new FakePrisma();
  const identity = new FakeIdentityClient();
  const profile = new FakeProfileClient();
  const graph = new FakeGraphClient();
  const service = new MessagesService(prisma as never, identity as never, profile as never, graph as never);
  return { service, prisma, identity, profile, graph };
}

test("startConversation canonicalizes participants and duplicate starts return the existing conversation", async () => {
  const { service, prisma } = createService();

  const first = await service.startConversation({ viewerUserId: " bob ", recipientUserId: "alice" });
  const second = await service.startConversation({ viewerUserId: "alice", recipientUserId: "bob" });

  assert.equal(first.id, second.id);
  assert.equal(first.participantLowUserId, "alice");
  assert.equal(first.participantHighUserId, "bob");
  assert.equal(prisma.conversations.length, 1);
});

test("startConversation returns existing conversation if duplicate create races with another starter", async () => {
  const { service, prisma } = createService();
  const now = prisma.nextDate();
  const existing: ConversationRow = {
    id: "msgc_existing",
    participantLowUserId: "alice",
    participantHighUserId: "bob",
    lastMessageId: null,
    lastMessagePreview: "",
    lastMessageAuthorUserId: null,
    lastMessageAt: null,
    createdAt: now,
    updatedAt: now,
  };
  prisma.failNextConversationCreateWithP2002 = true;
  prisma.conversationToInsertBeforeP2002 = existing;

  const result = await service.startConversation({ viewerUserId: "bob", recipientUserId: "alice" });

  assert.equal(result.id, existing.id);
  assert.equal(prisma.conversations.length, 1);
});

test("startConversation rejects self conversation, disabled direct inbox, and blocked pair", async () => {
  const { service, profile, graph } = createService();

  await assert.rejects(() => service.startConversation({ viewerUserId: "alice", recipientUserId: " alice " }), BadRequestException);

  profile.allowDirectInbox.set("bob", false);
  await assert.rejects(() => service.startConversation({ viewerUserId: "alice", recipientUserId: "bob" }), ForbiddenException);

  profile.allowDirectInbox.set("bob", true);
  graph.blockedPairs.add("alice:bob");
  await assert.rejects(() => service.startConversation({ viewerUserId: "alice", recipientUserId: "bob" }), ForbiddenException);
});

test("IdentityClientService.getUserById translates gRPC NOT_FOUND to null and preserves other errors", async () => {
  const notFoundClient = new IdentityClientService({
    getService: () => ({
      getUserById: () => throwError(() => Object.assign(new Error("missing"), { code: status.NOT_FOUND })),
    }),
  } as never);
  notFoundClient.onModuleInit();

  await assert.equal(await notFoundClient.getUserById("missing"), null);

  const unavailable = Object.assign(new Error("unavailable"), { code: status.UNAVAILABLE });
  const failingClient = new IdentityClientService({
    getService: () => ({
      getUserById: () => throwError(() => unavailable),
    }),
  } as never);
  failingClient.onModuleInit();

  await assert.rejects(() => failingClient.getUserById("alice"), unavailable);
});

test("sendMessage rejects nonparticipants, blank body, and bodies over 2000 characters", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({
    id: "msgc_existing",
    participantLowUserId: "alice",
    participantHighUserId: "bob",
  });

  await assert.rejects(
    () => service.sendMessage({ viewerUserId: "carol", conversationId: conversation.id, body: "hello" }),
    ForbiddenException,
  );
  await assert.rejects(
    () => service.sendMessage({ viewerUserId: "alice", conversationId: conversation.id, body: "   " }),
    BadRequestException,
  );
  await assert.rejects(
    () => service.sendMessage({ viewerUserId: "alice", conversationId: conversation.id, body: "x".repeat(2001) }),
    BadRequestException,
  );
});

test("sendMessage creates a message and updates conversation last-message fields and preview", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({
    id: "msgc_existing",
    participantLowUserId: "alice",
    participantHighUserId: "bob",
  });

  const message = await service.sendMessage({
    viewerUserId: "alice",
    conversationId: conversation.id,
    body: `  ${"hello ".repeat(40)}  `,
  });

  assert.match(message.id, /^msgm_/);
  assert.equal(message.body, "hello ".repeat(40).trim());
  assert.equal(prisma.messages.length, 1);
  assert.equal(conversation.lastMessageId, message.id);
  assert.equal(conversation.lastMessageAuthorUserId, "alice");
  assert.equal(conversation.lastMessageAt?.toISOString(), message.createdAt.toISOString());
  assert.equal(conversation.lastMessagePreview.length, 180);
});

test("sendMessage does not regress last-message fields when the created message is older than the current last message", async () => {
  const { service, prisma } = createService();
  const futureLastMessageAt = new Date("2026-01-02T00:00:00.000Z");
  const conversation = prisma.seedConversation({
    id: "msgc_existing",
    participantLowUserId: "alice",
    participantHighUserId: "bob",
    lastMessageId: "msgm_newer",
    lastMessagePreview: "newer",
    lastMessageAuthorUserId: "bob",
    lastMessageAt: futureLastMessageAt,
  });

  const message = await service.sendMessage({ viewerUserId: "alice", conversationId: conversation.id, body: "older" });

  assert.match(message.id, /^msgm_/);
  assert.equal(conversation.lastMessageId, "msgm_newer");
  assert.equal(conversation.lastMessagePreview, "newer");
  assert.equal(conversation.lastMessageAuthorUserId, "bob");
  assert.equal(conversation.lastMessageAt?.toISOString(), futureLastMessageAt.toISOString());
});

test("blocked existing conversations reject read/write operations and are omitted from conversation list", async () => {
  const { service, prisma, graph } = createService();
  const conversation = prisma.seedConversation({ id: "blocked", participantLowUserId: "alice", participantHighUserId: "bob" });
  const visible = prisma.seedConversation({ id: "visible", participantLowUserId: "alice", participantHighUserId: "carol" });
  const blockedMessage = prisma.seedMessage({ conversationId: conversation.id, authorUserId: "bob", body: "blocked" });
  conversation.lastMessageId = blockedMessage.id;
  conversation.lastMessageAt = blockedMessage.createdAt;
  const visibleMessage = prisma.seedMessage({ conversationId: visible.id, authorUserId: "carol", body: "visible" });
  visible.lastMessageId = visibleMessage.id;
  visible.lastMessageAt = visibleMessage.createdAt;
  graph.blockedPairs.add("alice:bob");

  await assert.rejects(() => service.sendMessage({ viewerUserId: "alice", conversationId: conversation.id, body: "nope" }), ForbiddenException);
  await assert.rejects(() => service.getConversation({ viewerUserId: "alice", conversationId: conversation.id }), ForbiddenException);
  await assert.rejects(() => service.markConversationRead({ viewerUserId: "alice", conversationId: conversation.id }), ForbiddenException);

  const list = await service.listConversations({ viewerUserId: "alice" });
  assert.deepEqual(
    list.conversations.map((item) => item.id),
    ["visible"],
  );
});

test("listConversations returns only viewer conversations ordered by activity with unread counts excluding viewer-authored messages", async () => {
  const { service, prisma } = createService();
  const older = prisma.seedConversation({ id: "older", participantLowUserId: "alice", participantHighUserId: "bob" });
  const unrelated = prisma.seedConversation({ id: "unrelated", participantLowUserId: "carol", participantHighUserId: "dave" });
  const newer = prisma.seedConversation({ id: "newer", participantLowUserId: "alice", participantHighUserId: "carol" });

  const oldMessage = prisma.seedMessage({ conversationId: older.id, authorUserId: "bob", body: "old" });
  older.lastMessageId = oldMessage.id;
  older.lastMessageAt = oldMessage.createdAt;
  const newestUnread = prisma.seedMessage({ conversationId: newer.id, authorUserId: "carol", body: "unread" });
  const viewerMessage = prisma.seedMessage({ conversationId: newer.id, authorUserId: "alice", body: "mine" });
  newer.lastMessageId = viewerMessage.id;
  newer.lastMessageAt = viewerMessage.createdAt;
  prisma.seedMessage({ conversationId: unrelated.id, authorUserId: "dave", body: "skip" });

  prisma.reads.push({
    id: "read_1",
    conversationId: newer.id,
    userId: "alice",
    lastReadMessageId: null,
    lastReadAt: oldMessage.createdAt,
    updatedAt: prisma.nextDate(),
  });

  const result = await service.listConversations({ viewerUserId: "alice" });

  assert.deepEqual(
    result.conversations.map((item) => item.id),
    ["newer", "older"],
  );
  assert.equal(result.conversations[0]?.unreadCount, 1);
  assert.equal(result.conversations[0]?.lastMessageId, viewerMessage.id);
  assert.equal(result.conversations[1]?.unreadCount, 1);
  assert.ok(newestUnread.createdAt > oldMessage.createdAt);
});

test("listConversations uses encoded activity cursors and rejects invalid cursors", async () => {
  const { service, prisma } = createService();
  const oldest = prisma.seedConversation({ id: "oldest", participantLowUserId: "alice", participantHighUserId: "bob" });
  const newest = prisma.seedConversation({ id: "newest", participantLowUserId: "alice", participantHighUserId: "carol" });
  const oldestMessage = prisma.seedMessage({ conversationId: oldest.id, authorUserId: "bob", body: "oldest" });
  oldest.lastMessageId = oldestMessage.id;
  oldest.lastMessageAt = oldestMessage.createdAt;
  const newestMessage = prisma.seedMessage({ conversationId: newest.id, authorUserId: "carol", body: "newest" });
  newest.lastMessageId = newestMessage.id;
  newest.lastMessageAt = newestMessage.createdAt;

  const firstPage = await service.listConversations({ viewerUserId: "alice", limit: 1 });

  assert.deepEqual(
    firstPage.conversations.map((item) => item.id),
    ["newest"],
  );
  assert.ok(firstPage.nextCursor);
  assert.notEqual(firstPage.nextCursor, "newest");

  const secondPage = await service.listConversations({ viewerUserId: "alice", limit: 1, cursor: firstPage.nextCursor ?? undefined });
  assert.deepEqual(
    secondPage.conversations.map((item) => item.id),
    ["oldest"],
  );
  assert.equal(secondPage.nextCursor, null);

  await assert.rejects(() => service.listConversations({ viewerUserId: "alice", cursor: "not-a-valid-cursor" }), BadRequestException);
});

test("listConversations unread count uses lastReadMessageId as tie-breaker for same-timestamp messages", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({ id: "thread", participantLowUserId: "alice", participantHighUserId: "bob" });
  const sharedCreatedAt = new Date("2026-01-01T10:00:00.000Z");
  const readMessage = prisma.seedMessage({
    id: "msgm_001",
    conversationId: conversation.id,
    authorUserId: "bob",
    body: "read",
    createdAt: sharedCreatedAt,
  });
  const unreadMessage = prisma.seedMessage({
    id: "msgm_002",
    conversationId: conversation.id,
    authorUserId: "bob",
    body: "unread",
    createdAt: sharedCreatedAt,
  });
  prisma.seedMessage({
    id: "msgm_003",
    conversationId: conversation.id,
    authorUserId: "alice",
    body: "mine",
    createdAt: sharedCreatedAt,
  });
  conversation.lastMessageId = unreadMessage.id;
  conversation.lastMessageAt = unreadMessage.createdAt;
  prisma.reads.push({
    id: "read_1",
    conversationId: conversation.id,
    userId: "alice",
    lastReadMessageId: readMessage.id,
    lastReadAt: readMessage.createdAt,
    updatedAt: prisma.nextDate(),
  });

  const result = await service.listConversations({ viewerUserId: "alice" });

  assert.equal(result.conversations[0]?.unreadCount, 1);
});

test("getConversation rejects nonparticipants and returns display-ordered paginated messages", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({ id: "thread", participantLowUserId: "alice", participantHighUserId: "bob" });
  const first = prisma.seedMessage({ conversationId: conversation.id, authorUserId: "alice", body: "first" });
  const second = prisma.seedMessage({ conversationId: conversation.id, authorUserId: "bob", body: "second" });
  const third = prisma.seedMessage({ conversationId: conversation.id, authorUserId: "alice", body: "third" });

  await assert.rejects(
    () => service.getConversation({ viewerUserId: "carol", conversationId: conversation.id }),
    ForbiddenException,
  );

  const firstPage = await service.getConversation({ viewerUserId: "alice", conversationId: conversation.id, limit: 2 });
  assert.deepEqual(
    firstPage.messages.map((message) => message.id),
    [second.id, third.id],
  );
  assert.equal(firstPage.nextCursor, second.id);

  const secondPage = await service.getConversation({
    viewerUserId: "alice",
    conversationId: conversation.id,
    limit: 2,
    beforeCursor: firstPage.nextCursor,
  });
  assert.deepEqual(
    secondPage.messages.map((message) => message.id),
    [first.id],
  );
  assert.equal(secondPage.nextCursor, null);
});

test("markConversationRead upserts read state and clears unread count", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({ id: "thread", participantLowUserId: "alice", participantHighUserId: "bob" });
  const message = prisma.seedMessage({ conversationId: conversation.id, authorUserId: "bob", body: "read me" });
  conversation.lastMessageId = message.id;
  conversation.lastMessageAt = message.createdAt;

  const before = await service.listConversations({ viewerUserId: "alice" });
  assert.equal(before.conversations[0]?.unreadCount, 1);

  const result = await service.markConversationRead({ viewerUserId: "alice", conversationId: conversation.id });
  assert.deepEqual(result, { updated: true });

  const read = prisma.reads[0];
  assert.equal(read?.lastReadMessageId, message.id);
  assert.equal(read?.lastReadAt?.toISOString(), message.createdAt.toISOString());

  const after = await service.listConversations({ viewerUserId: "alice" });
  assert.equal(after.conversations[0]?.unreadCount, 0);
});

test("markConversationRead on an empty conversation does not hide the first future incoming message", async () => {
  const { service, prisma } = createService();
  const conversation = prisma.seedConversation({ id: "empty", participantLowUserId: "alice", participantHighUserId: "bob" });

  const result = await service.markConversationRead({ viewerUserId: "alice", conversationId: conversation.id });
  assert.deepEqual(result, { updated: true });
  assert.equal(prisma.reads[0]?.lastReadMessageId, null);
  assert.equal(prisma.reads[0]?.lastReadAt, null);

  await service.sendMessage({ viewerUserId: "bob", conversationId: conversation.id, body: "first message" });

  const after = await service.listConversations({ viewerUserId: "alice" });
  assert.equal(after.conversations[0]?.unreadCount, 1);
});

function matches(row: Record<string, any>, where: any): boolean {
  if (!where) {
    return true;
  }
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") {
      return (value as any[]).some((item) => matches(row, item));
    }
    if (key === "AND") {
      return (value as any[]).every((item) => matches(row, item));
    }
    if (typeof value === "object" && value !== null && !(value instanceof Date)) {
      const condition = value as { not?: unknown; gt?: unknown; lt?: unknown };
      if ("not" in condition && row[key] === condition.not) {
        return false;
      }
      if ("gt" in condition && !((row[key] as any) > (condition.gt as any))) {
        return false;
      }
      if ("lt" in condition && !((row[key] as any) < (condition.lt as any))) {
        return false;
      }
      return true;
    }
    return row[key] === value;
  });
}

function orderRows<T extends Record<string, any>>(rows: T[], orderBy: any): T[] {
  const clauses = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return [...rows].sort((left, right) => {
    for (const clause of clauses) {
      const [field, direction] = Object.entries(clause)[0] as [string, "asc" | "desc"];
      const leftValue = left[field] instanceof Date ? left[field].getTime() : left[field];
      const rightValue = right[field] instanceof Date ? right[field].getTime() : right[field];
      if (leftValue < rightValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (leftValue > rightValue) {
        return direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  });
}
