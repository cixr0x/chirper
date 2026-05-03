# Direct Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/messages` mock with working 1:1 direct conversations backed by a dedicated persisted `messages` service.

**Architecture:** Add a new internal `messages` service that owns `msg_*` tables and exposes `messages.v1` gRPC methods. BFF authenticates the viewer, calls `messages`, enriches user summaries, and web calls only BFF-backed helpers/actions. `realtime` remains delivery-only and is not required for the first durable chat release.

**Tech Stack:** TypeScript, NestJS, gRPC/protobuf, Prisma/MySQL, Next.js server components/actions, Node test runner, Helm/kind deployment scripts.

---

## File Structure

- Create `packages/contracts-proto/proto/messages/v1/messages.proto`: gRPC contract for conversations, messages, and read state.
- Modify `packages/contracts-proto/README.md`: list the new message contract owner if the README contract list is updated during implementation.
- Modify `service-boundaries.json`: add the `messages` service with `msg` ownership and ports `4009`/`50059`.
- Modify root `package.json`: add `db:messages:*` and `dev:messages` scripts and include messages in `prisma:generate`.
- Modify `scripts/k8s-deploy.ps1` and `scripts/k8s-build-images.ps1`: include `messages` in selectable services, image build, and migrations.
- Create `services/messages/**`: new Nest service with Prisma schema, migration, health controller, gRPC controller, domain service, tests, env examples, and README.
- Modify `packages/contracts-proto/proto/profile/v1/profile.proto`: expose `allowDirectInbox`.
- Modify `services/profile/src/profile-directory.service.ts`: return `allowDirectInbox`.
- Modify `services/bff/src/clients/profile.client.ts`: normalize `allowDirectInbox`.
- Modify `services/bff/src/user-summary.service.ts`: include `allowDirectInbox` in summaries when useful for message-start UI.
- Modify `packages/contracts-proto/proto/graph/v1/graph.proto`: add `HasBlockBetween`.
- Modify `services/graph/src/graph.service.ts` and `services/graph/src/graph.grpc.controller.ts`: expose block lookup.
- Modify `services/bff/src/clients/graph.client.ts`: add `hasBlockBetween`.
- Modify `services/bff/src/proto-paths.ts` and `services/bff/src/app.module.ts`: wire `messages` gRPC client.
- Create `services/bff/src/clients/messages.client.ts`: BFF gRPC client wrapper.
- Create `services/bff/src/messages.controller.ts` and `services/bff/src/messages.controller.test.ts`: authenticated HTTP API and enrichment.
- Modify `apps/web/lib/bff.ts`: add message types and BFF helper methods.
- Modify `apps/web/app/actions.ts`: add start/send/read message server actions.
- Modify `apps/web/app/messages/page.tsx`: render real inbox/thread data.
- Create `apps/web/components/message-start-card.tsx`: client user-search entry point that starts a conversation.
- Create or modify `apps/web/lib/message-page-source.test.ts`: source-level regression checks for the message page and actions.
- Modify `apps/web/app/globals.css`: add styles only where existing message classes are insufficient.
- Create `infra/helm/values/local/messages.yaml` and `infra/helm/values/server/messages.yaml`: Helm values for the new service.
- Modify `infra/helm/values/local/bff.yaml` and `infra/helm/values/server/bff.yaml`: add `MESSAGES_GRPC_URL=messages:50059`.

## Task 1: Expose Direct-Inbox And Block Policy

**Files:**
- Modify: `packages/contracts-proto/proto/profile/v1/profile.proto`
- Modify: `services/profile/src/profile-directory.service.ts`
- Modify: `services/bff/src/clients/profile.client.ts`
- Modify: `services/bff/src/user-summary.service.ts`
- Modify: `services/bff/src/user-summary.service.test.ts`
- Modify: `packages/contracts-proto/proto/graph/v1/graph.proto`
- Modify: `services/graph/src/graph.service.ts`
- Modify: `services/graph/src/graph.grpc.controller.ts`
- Modify: `services/bff/src/clients/graph.client.ts`
- Create: `services/graph/src/graph.service.test.ts`

- [ ] **Step 1: Write failing profile summary test**

Update `services/bff/src/user-summary.service.test.ts` so the fake profile client returns `allowDirectInbox: true` and the expected result includes it:

```ts
allowDirectInbox: true,
```

Run: `node --test --import tsx services/bff/src/user-summary.service.test.ts`
Expected: FAIL because `UserSummaryService` does not include `allowDirectInbox`.

- [ ] **Step 2: Expose allowDirectInbox in proto and services**

Add field `bool allowDirectInbox = 9;` to `ProfileSummary` in `packages/contracts-proto/proto/profile/v1/profile.proto`.

Update `services/profile/src/profile-directory.service.ts`:

```ts
type UserProfile = {
  userId: string;
  bio: string;
  location: string;
  avatarAssetId: string;
  bannerAssetId: string;
  avatarUrl: string;
  bannerUrl: string;
  allowDirectInbox: boolean;
  links: { label: string; url: string }[];
};
```

In `getProfileByUserId`, load `profileSetting` with `profile`, and return `allowDirectInbox: profileSetting?.allowDirectInbox ?? true` for both existing and empty profiles.

Update `services/bff/src/clients/profile.client.ts` response type and normalizer:

```ts
allowDirectInbox: response.allowDirectInbox ?? true,
```

Update `services/bff/src/user-summary.service.ts` to include:

```ts
allowDirectInbox: profile.allowDirectInbox,
```

- [ ] **Step 3: Verify profile summary test passes**

Run: `node --test --import tsx services/bff/src/user-summary.service.test.ts`
Expected: PASS.

- [ ] **Step 4: Write failing graph block lookup test**

Create `services/graph/src/graph.service.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { GraphService } from "./graph.service";

test("hasBlockBetween returns true when either user blocked the other", async () => {
  const service = new GraphService({
    block: {
      findFirst: async ({ where }: { where: unknown }) => {
        assert.deepEqual(where, {
          OR: [
            { blockerId: "usr_a", blockedId: "usr_b" },
            { blockerId: "usr_b", blockedId: "usr_a" },
          ],
        });
        return { id: "block_1" };
      },
    },
  } as never);

  assert.equal(await service.hasBlockBetween("usr_a", "usr_b"), true);
});

test("hasBlockBetween returns false when ids are empty or no block exists", async () => {
  const service = new GraphService({
    block: {
      findFirst: async () => null,
    },
  } as never);

  assert.equal(await service.hasBlockBetween("usr_a", "usr_b"), false);
  assert.equal(await service.hasBlockBetween("", "usr_b"), false);
});
```

Run: `node --test --import tsx services/graph/src/graph.service.test.ts`
Expected: FAIL because `hasBlockBetween` is not defined.

- [ ] **Step 5: Implement graph block lookup**

Add to `packages/contracts-proto/proto/graph/v1/graph.proto`:

```proto
rpc HasBlockBetween (HasBlockBetweenRequest) returns (HasBlockBetweenResponse);

message HasBlockBetweenRequest {
  string userIdA = 1;
  string userIdB = 2;
}

message HasBlockBetweenResponse {
  bool blocked = 1;
}
```

Add to `services/graph/src/graph.service.ts`:

```ts
async hasBlockBetween(userIdA: string, userIdB: string) {
  const left = userIdA.trim();
  const right = userIdB.trim();
  if (!left || !right) {
    return false;
  }

  const block = await this.prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: left, blockedId: right },
        { blockerId: right, blockedId: left },
      ],
    },
  });

  return Boolean(block);
}
```

Add to `services/graph/src/graph.grpc.controller.ts`:

```ts
@GrpcMethod("GraphService", "HasBlockBetween")
async hasBlockBetween(data: { userIdA: string; userIdB: string }) {
  return { blocked: await this.graph.hasBlockBetween(data.userIdA, data.userIdB) };
}
```

Add to `services/bff/src/clients/graph.client.ts` types and service wrapper:

```ts
type HasBlockBetweenRequest = { userIdA: string; userIdB: string };
type HasBlockBetweenResponse = { blocked: boolean };

hasBlockBetween(request: HasBlockBetweenRequest): Observable<HasBlockBetweenResponse>;

async hasBlockBetween(userIdA: string, userIdB: string) {
  const response = await lastValueFrom(this.service.hasBlockBetween({ userIdA, userIdB }));
  return response.blocked ?? false;
}
```

- [ ] **Step 6: Verify policy support tests pass**

Run:

```powershell
node --test --import tsx services/bff/src/user-summary.service.test.ts
node --test --import tsx services/graph/src/graph.service.test.ts
npm run typecheck -w @chirper/profile
npm run typecheck -w @chirper/graph
npm run typecheck -w @chirper/bff
```

Expected: all commands pass.

- [ ] **Step 7: Commit policy support**

Run:

```powershell
git add packages/contracts-proto/proto/profile/v1/profile.proto packages/contracts-proto/proto/graph/v1/graph.proto services/profile/src/profile-directory.service.ts services/bff/src/clients/profile.client.ts services/bff/src/user-summary.service.ts services/bff/src/user-summary.service.test.ts services/graph/src/graph.service.ts services/graph/src/graph.grpc.controller.ts services/graph/src/graph.service.test.ts services/bff/src/clients/graph.client.ts
git commit -m "feat: expose direct message policy checks"
```

## Task 2: Scaffold The Messages Service And Contracts

**Files:**
- Create: `packages/contracts-proto/proto/messages/v1/messages.proto`
- Modify: `service-boundaries.json`
- Modify: `package.json`
- Modify: `scripts/k8s-deploy.ps1`
- Modify: `scripts/k8s-build-images.ps1`
- Create: `services/messages/package.json`
- Create: `services/messages/tsconfig.json`
- Create: `services/messages/tsconfig.build.json`
- Create: `services/messages/.env.example`
- Create: `services/messages/README.md`
- Create: `services/messages/src/load-env.ts`
- Create: `services/messages/src/main.ts`
- Create: `services/messages/src/app.module.ts`
- Create: `services/messages/src/health.controller.ts`
- Create: `services/messages/src/prisma.service.ts`
- Create: `services/messages/prisma/schema.prisma`
- Create: `services/messages/db/migrations/V2026.05.03.001__create_messages_baseline.sql`
- Create: `services/messages/db/README.md`

- [ ] **Step 1: Write the messages proto**

Create `packages/contracts-proto/proto/messages/v1/messages.proto`:

```proto
syntax = "proto3";

package messages.v1;

service MessagesService {
  rpc ListConversations (ListConversationsRequest) returns (ListConversationsResponse);
  rpc GetConversation (GetConversationRequest) returns (GetConversationResponse);
  rpc StartConversation (StartConversationRequest) returns (ConversationRecord);
  rpc SendMessage (SendMessageRequest) returns (MessageRecord);
  rpc MarkConversationRead (MarkConversationReadRequest) returns (MarkConversationReadResponse);
}

message ListConversationsRequest {
  string viewerUserId = 1;
  int32 limit = 2;
  string cursor = 3;
}

message GetConversationRequest {
  string viewerUserId = 1;
  string conversationId = 2;
  int32 limit = 3;
  string beforeCursor = 4;
}

message StartConversationRequest {
  string viewerUserId = 1;
  string recipientUserId = 2;
}

message SendMessageRequest {
  string viewerUserId = 1;
  string conversationId = 2;
  string body = 3;
}

message MarkConversationReadRequest {
  string viewerUserId = 1;
  string conversationId = 2;
}

message ConversationRecord {
  string conversationId = 1;
  repeated string participantUserIds = 2;
  string otherUserId = 3;
  string lastMessageId = 4;
  string lastMessagePreview = 5;
  string lastMessageAuthorUserId = 6;
  string lastMessageAt = 7;
  int32 unreadCount = 8;
  string createdAt = 9;
  string updatedAt = 10;
}

message MessageRecord {
  string messageId = 1;
  string conversationId = 2;
  string authorUserId = 3;
  string body = 4;
  string createdAt = 5;
}

message ListConversationsResponse {
  repeated ConversationRecord conversations = 1;
  string nextCursor = 2;
}

message GetConversationResponse {
  ConversationRecord conversation = 1;
  repeated MessageRecord messages = 2;
  string nextCursor = 3;
}

message MarkConversationReadResponse {
  bool updated = 1;
}
```

- [ ] **Step 2: Add workspace and deployment registration**

Modify root `package.json`:

```json
"db:messages:info": "node ./scripts/flyway-run.mjs --service messages --command info",
"db:messages:migrate": "node ./scripts/flyway-run.mjs --service messages --command migrate",
"db:messages:validate": "node ./scripts/flyway-run.mjs --service messages --command validate",
"db:messages:seed:demo": "node ./scripts/sql-file-run.mjs --service messages --file db/seeds/demo.sql",
"dev:messages": "npm run dev -w @chirper/messages"
```

Add `npm run prisma:generate -w @chirper/messages` to `prisma:generate`. Do not add `messages` to `db:seed:demo` in this feature because this plan does not create a messages seed file.

Add to `service-boundaries.json`:

```json
"messages": {
  "kind": "service",
  "dbPrefix": "msg",
  "httpPort": 4009,
  "grpcPort": 50059
}
```

Update `scripts/k8s-deploy.ps1`:

```powershell
$allReleases = @(
  "identity",
  "profile",
  "media",
  "realtime",
  "posts",
  "graph",
  "timeline",
  "notifications",
  "messages",
  "bff",
  "web"
)

$migrationScriptsByRelease = @{
  messages = "db:messages:migrate"
}
```

Merge the `messages` migration entry into the existing hashtable without removing existing entries.

Update `scripts/k8s-build-images.ps1` service lists so `messages` can be selected and maps to `chirper/messages`.

- [ ] **Step 3: Create service scaffold**

Create `services/messages/package.json`:

```json
{
  "name": "@chirper/messages",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "prisma:generate": "node ../../scripts/prisma-generate.mjs --service messages",
    "dev": "npm run prisma:generate && tsx watch src/main.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@grpc/grpc-js": "^1.14.3",
    "@grpc/proto-loader": "^0.8.0",
    "@nestjs/common": "^11.1.19",
    "@nestjs/core": "^11.1.19",
    "@nestjs/microservices": "^11.1.19",
    "@nestjs/platform-fastify": "^11.1.19",
    "@prisma/client": "^6.19.3",
    "dotenv": "^17.2.3",
    "fastify": "^5.8.5",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2"
  }
}
```

Copy the `tsconfig.json`, `tsconfig.build.json`, `load-env.ts`, and `prisma.service.ts` patterns from `services/notifications`, changing only service names and relative paths.

Create `services/messages/src/main.ts` with package `messages.v1`, proto path `../../packages/contracts-proto/proto/messages/v1/messages.proto`, default gRPC bind `0.0.0.0:50059`, and default HTTP port `4009`.

Create `services/messages/src/health.controller.ts` returning:

```ts
{
  service: "messages",
  prefix: "msg",
  tables: ["msg_conversations", "msg_messages", "msg_conversation_reads"],
  transports: ["http", "grpc"],
  status: "ok",
}
```

- [ ] **Step 4: Create Prisma schema and SQL migration**

Create `services/messages/prisma/schema.prisma` with models `Conversation`, `Message`, and `ConversationRead` matching the approved design. Use `@@map` table names and `@map` column names.

Create `services/messages/db/migrations/V2026.05.03.001__create_messages_baseline.sql`:

```sql
CREATE TABLE IF NOT EXISTS msg_conversations (
  id VARCHAR(64) PRIMARY KEY,
  participant_low_user_id VARCHAR(64) NOT NULL,
  participant_high_user_id VARCHAR(64) NOT NULL,
  last_message_id VARCHAR(64) NULL,
  last_message_preview VARCHAR(180) NOT NULL DEFAULT '',
  last_message_author_user_id VARCHAR(64) NULL,
  last_message_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY msg_conversations_participants_key (participant_low_user_id, participant_high_user_id),
  KEY msg_conversations_last_message_idx (last_message_at, id)
);

CREATE TABLE IF NOT EXISTS msg_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  author_user_id VARCHAR(64) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY msg_messages_conversation_created_idx (conversation_id, created_at, id)
);

CREATE TABLE IF NOT EXISTS msg_conversation_reads (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  last_read_message_id VARCHAR(64) NULL,
  last_read_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY msg_conversation_reads_conversation_user_key (conversation_id, user_id)
);
```

- [ ] **Step 5: Verify scaffold compiles far enough**

Run:

```powershell
npm install
npm run prisma:generate -w @chirper/messages
npm run typecheck -w @chirper/messages
npm run check:boundaries
```

Expected: `@chirper/messages` typecheck may fail until the gRPC controller is created in Task 4 if `app.module.ts` imports it. Keep `app.module.ts` limited to `HealthController` for this scaffold task so the expected result is PASS.

- [ ] **Step 6: Commit messages scaffold**

Run:

```powershell
git add packages/contracts-proto/proto/messages/v1/messages.proto service-boundaries.json package.json package-lock.json scripts/k8s-deploy.ps1 scripts/k8s-build-images.ps1 services/messages
git commit -m "feat: scaffold messages service"
```

## Task 3: Implement Messages Domain Logic

**Files:**
- Create: `services/messages/src/messages.service.test.ts`
- Create: `services/messages/src/messages.service.ts`
- Modify: `services/messages/src/app.module.ts`

- [ ] **Step 1: Write failing canonical conversation tests**

Create `services/messages/src/messages.service.test.ts` with in-memory Prisma fakes and tests:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { MessagesService } from "./messages.service";

function createService(overrides: Partial<{
  identityClient: { getUserById(userId: string): Promise<unknown> };
  profileClient: { getProfileByUserId(userId: string): Promise<{ allowDirectInbox: boolean }> };
  graphClient: { hasBlockBetween(userIdA: string, userIdB: string): Promise<boolean> };
}> = {}) {
  const conversations: any[] = [];
  const messages: any[] = [];
  const reads: any[] = [];
  const prisma = {
    conversation: {
      findUnique: async ({ where }: any) => conversations.find((row) => row.id === where.id || (
        where.participantLowUserId_participantHighUserId &&
        row.participantLowUserId === where.participantLowUserId_participantHighUserId.participantLowUserId &&
        row.participantHighUserId === where.participantLowUserId_participantHighUserId.participantHighUserId
      )) ?? null,
      findMany: async () => conversations.slice().sort((left, right) => String(right.lastMessageAt ?? "").localeCompare(String(left.lastMessageAt ?? ""))),
      create: async ({ data }: any) => {
        conversations.push({ ...data, createdAt: new Date("2026-05-03T12:00:00.000Z"), updatedAt: new Date("2026-05-03T12:00:00.000Z") });
        return conversations.at(-1);
      },
      update: async ({ where, data }: any) => {
        const row = conversations.find((item) => item.id === where.id);
        Object.assign(row, data, { updatedAt: new Date("2026-05-03T12:01:00.000Z") });
        return row;
      },
    },
    message: {
      count: async ({ where }: any) => messages.filter((row) => row.conversationId === where.conversationId && row.authorUserId?.not !== row.authorUserId).length,
      findMany: async ({ where }: any) => messages.filter((row) => row.conversationId === where.conversationId),
      create: async ({ data }: any) => {
        const row = { ...data, createdAt: new Date("2026-05-03T12:02:00.000Z") };
        messages.push(row);
        return row;
      },
    },
    conversationRead: {
      findUnique: async ({ where }: any) => reads.find((row) => row.conversationId === where.conversationId_userId.conversationId && row.userId === where.conversationId_userId.userId) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const row = reads.find((item) => item.conversationId === where.conversationId_userId.conversationId && item.userId === where.conversationId_userId.userId);
        if (row) {
          Object.assign(row, update);
          return row;
        }
        reads.push(create);
        return create;
      },
    },
    $transaction: async (callback: any) => callback(prisma),
  };

  return {
    service: new MessagesService(
      prisma as never,
      overrides.identityClient as never ?? { getUserById: async (userId: string) => ({ userId }) },
      overrides.profileClient as never ?? { getProfileByUserId: async () => ({ allowDirectInbox: true }) },
      overrides.graphClient as never ?? { hasBlockBetween: async () => false },
    ),
    conversations,
    messages,
    reads,
  };
}

test("startConversation canonicalizes participants and returns existing duplicate", async () => {
  const { service, conversations } = createService();
  const first = await service.startConversation({ viewerUserId: "usr_b", recipientUserId: "usr_a" });
  const second = await service.startConversation({ viewerUserId: "usr_a", recipientUserId: "usr_b" });

  assert.equal(conversations.length, 1);
  assert.equal(first.conversationId, second.conversationId);
  assert.deepEqual(first.participantUserIds, ["usr_a", "usr_b"]);
});
```

Run: `node --test --import tsx services/messages/src/messages.service.test.ts`
Expected: FAIL because `messages.service.ts` does not exist.

- [ ] **Step 2: Implement service constructor and startConversation**

Create `services/messages/src/messages.service.ts` with:

```ts
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { IdentityClientService } from "./clients/identity.client";
import { ProfileClientService } from "./clients/profile.client";
import { GraphClientService } from "./clients/graph.client";

@Injectable()
export class MessagesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentityClientService) private readonly identityClient: IdentityClientService,
    @Inject(ProfileClientService) private readonly profileClient: ProfileClientService,
    @Inject(GraphClientService) private readonly graphClient: GraphClientService,
  ) {}

  async startConversation(input: { viewerUserId: string; recipientUserId: string }) {
    const viewerUserId = input.viewerUserId.trim();
    const recipientUserId = input.recipientUserId.trim();
    if (!viewerUserId || !recipientUserId) {
      throw new BadRequestException("Both viewerUserId and recipientUserId are required.");
    }
    if (viewerUserId === recipientUserId) {
      throw new BadRequestException("A user cannot message themselves.");
    }

    await this.identityClient.getUserById(recipientUserId);
    const profile = await this.profileClient.getProfileByUserId(recipientUserId);
    if (!profile.allowDirectInbox) {
      throw new ForbiddenException("This user does not allow direct messages.");
    }
    if (await this.graphClient.hasBlockBetween(viewerUserId, recipientUserId)) {
      throw new ForbiddenException("Direct messages are unavailable for these users.");
    }

    const [participantLowUserId, participantHighUserId] = canonicalPair(viewerUserId, recipientUserId);
    const existing = await this.prisma.conversation.findUnique({
      where: {
        participantLowUserId_participantHighUserId: {
          participantLowUserId,
          participantHighUserId,
        },
      },
    });
    if (existing) {
      return this.mapConversation(existing, viewerUserId, 0);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        id: `msgc_${randomUUID().replace(/-/g, "")}`,
        participantLowUserId,
        participantHighUserId,
      },
    });

    return this.mapConversation(conversation, viewerUserId, 0);
  }

  private mapConversation(conversation: any, viewerUserId: string, unreadCount: number) {
    const participantUserIds = [conversation.participantLowUserId, conversation.participantHighUserId];
    return {
      conversationId: conversation.id,
      participantUserIds,
      otherUserId: participantUserIds.find((userId) => userId !== viewerUserId) ?? "",
      lastMessageId: conversation.lastMessageId ?? "",
      lastMessagePreview: conversation.lastMessagePreview ?? "",
      lastMessageAuthorUserId: conversation.lastMessageAuthorUserId ?? "",
      lastMessageAt: conversation.lastMessageAt?.toISOString?.() ?? "",
      unreadCount,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}

function canonicalPair(left: string, right: string) {
  return [left, right].sort((a, b) => a.localeCompare(b)) as [string, string];
}
```

Create lightweight client wrappers in `services/messages/src/clients/identity.client.ts`, `profile.client.ts`, and `graph.client.ts` using the BFF client patterns. Register them in `services/messages/src/app.module.ts` with `ClientsModule.register` for `IDENTITY_PACKAGE`, `PROFILE_PACKAGE`, and `GRAPH_PACKAGE`.

- [ ] **Step 3: Verify canonical tests pass**

Run: `node --test --import tsx services/messages/src/messages.service.test.ts`
Expected: PASS for the canonical test.

- [ ] **Step 4: Add failing send/read/list tests**

Append tests covering:

```ts
test("sendMessage rejects nonparticipants and blank bodies", async () => {
  const { service } = createService();
  const conversation = await service.startConversation({ viewerUserId: "usr_a", recipientUserId: "usr_b" });

  await assert.rejects(
    () => service.sendMessage({ viewerUserId: "usr_c", conversationId: conversation.conversationId, body: "hello" }),
    /participant/,
  );
  await assert.rejects(
    () => service.sendMessage({ viewerUserId: "usr_a", conversationId: conversation.conversationId, body: "   " }),
    /Message body is required/,
  );
});

test("sendMessage updates last message and markConversationRead clears unread count", async () => {
  const { service } = createService();
  const conversation = await service.startConversation({ viewerUserId: "usr_a", recipientUserId: "usr_b" });
  const message = await service.sendMessage({ viewerUserId: "usr_a", conversationId: conversation.conversationId, body: "hello there" });

  assert.equal(message.body, "hello there");
  const beforeRead = await service.listConversations({ viewerUserId: "usr_b", limit: 10 });
  assert.equal(beforeRead.conversations[0].unreadCount, 1);

  await service.markConversationRead({ viewerUserId: "usr_b", conversationId: conversation.conversationId });
  const afterRead = await service.listConversations({ viewerUserId: "usr_b", limit: 10 });
  assert.equal(afterRead.conversations[0].unreadCount, 0);
});
```

Run: `node --test --import tsx services/messages/src/messages.service.test.ts`
Expected: FAIL because send/list/read methods are not implemented.

- [ ] **Step 5: Implement sendMessage, listConversations, getConversation, markConversationRead**

Implement methods with these rules:

```ts
private async requireConversationForViewer(conversationId: string, viewerUserId: string) {
  const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) {
    throw new NotFoundException("Conversation was not found.");
  }
  const participants = [conversation.participantLowUserId, conversation.participantHighUserId];
  if (!participants.includes(viewerUserId)) {
    throw new ForbiddenException("Viewer is not a participant in this conversation.");
  }
  return conversation;
}

private normalizeBody(body: string) {
  const normalized = body.trim();
  if (!normalized) {
    throw new BadRequestException("Message body is required.");
  }
  if (normalized.length > 2000) {
    throw new BadRequestException("Message body must be 2,000 characters or fewer.");
  }
  return normalized;
}
```

`sendMessage` creates `msgm_<uuid>`, updates the parent conversation last-message fields in one transaction, and returns a `MessageRecord`.

`listConversations` filters conversations where the viewer is either participant column, orders by `lastMessageAt desc` then `updatedAt desc`, applies a base64url date/id cursor, and computes unread count using messages where `createdAt > lastReadAt` and `authorUserId != viewerUserId`.

`getConversation` verifies participant membership, returns newest messages ordered ascending for display, supports `beforeCursor`, and returns the mapped conversation.

`markConversationRead` finds the newest message in the conversation and upserts `msg_conversation_reads`.

- [ ] **Step 6: Verify messages service domain tests and typecheck**

Run:

```powershell
node --test --import tsx services/messages/src/messages.service.test.ts
npm run prisma:generate -w @chirper/messages
npm run typecheck -w @chirper/messages
```

Expected: all commands pass.

- [ ] **Step 7: Commit domain logic**

Run:

```powershell
git add services/messages/src services/messages/prisma/schema.prisma services/messages/package.json package-lock.json
git commit -m "feat: implement messages domain service"
```

## Task 4: Add Messages gRPC And BFF API

**Files:**
- Create: `services/messages/src/messages.grpc.controller.ts`
- Modify: `services/messages/src/app.module.ts`
- Modify: `services/bff/src/proto-paths.ts`
- Modify: `services/bff/src/app.module.ts`
- Create: `services/bff/src/clients/messages.client.ts`
- Create: `services/bff/src/messages.controller.ts`
- Create: `services/bff/src/messages.controller.test.ts`

- [ ] **Step 1: Write failing BFF controller test**

Create `services/bff/src/messages.controller.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { MessagesController } from "./messages.controller";

test("listConversations requires session and enriches other participants", async () => {
  const calls: unknown[] = [];
  const controller = new MessagesController(
    {
      listConversations: async (viewerUserId: string, limit: number, cursor?: string) => {
        calls.push({ viewerUserId, limit, cursor });
        return {
          conversations: [{
            conversationId: "msgc_1",
            participantUserIds: ["usr_a", "usr_b"],
            otherUserId: "usr_b",
            lastMessagePreview: "hello",
            lastMessageAt: "2026-05-03T12:00:00.000Z",
            unreadCount: 2,
          }],
          nextCursor: "",
        };
      },
    } as never,
    {
      requireSession: async (token?: string) => {
        assert.equal(token, "session_1");
        return { userId: "usr_a" };
      },
    } as never,
    {
      getUserSummaryById: async (userId: string) => ({
        userId,
        handle: "alana",
        displayName: "Alana Pierce",
        avatarUrl: "https://cdn.example.com/alana.png",
      }),
    } as never,
  );

  const result = await controller.listConversations("10", "", "session_1");

  assert.deepEqual(calls, [{ viewerUserId: "usr_a", limit: 10, cursor: undefined }]);
  assert.equal(result.conversations[0].otherUser.handle, "alana");
});
```

Run: `node --test --import tsx services/bff/src/messages.controller.test.ts`
Expected: FAIL because `MessagesController` does not exist.

- [ ] **Step 2: Add messages gRPC controller**

Create `services/messages/src/messages.grpc.controller.ts`:

```ts
import { Controller, Inject } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { MessagesService } from "./messages.service";

@Controller()
export class MessagesGrpcController {
  constructor(@Inject(MessagesService) private readonly messages: MessagesService) {}

  @GrpcMethod("MessagesService", "ListConversations")
  listConversations(data: { viewerUserId: string; limit?: number; cursor?: string }) {
    return this.messages.listConversations({
      viewerUserId: data.viewerUserId,
      limit: data.limit ?? 20,
      cursor: data.cursor?.trim() || undefined,
    });
  }

  @GrpcMethod("MessagesService", "GetConversation")
  getConversation(data: { viewerUserId: string; conversationId: string; limit?: number; beforeCursor?: string }) {
    return this.messages.getConversation({
      viewerUserId: data.viewerUserId,
      conversationId: data.conversationId,
      limit: data.limit ?? 30,
      beforeCursor: data.beforeCursor?.trim() || undefined,
    });
  }

  @GrpcMethod("MessagesService", "StartConversation")
  startConversation(data: { viewerUserId: string; recipientUserId: string }) {
    return this.messages.startConversation(data);
  }

  @GrpcMethod("MessagesService", "SendMessage")
  sendMessage(data: { viewerUserId: string; conversationId: string; body: string }) {
    return this.messages.sendMessage(data);
  }

  @GrpcMethod("MessagesService", "MarkConversationRead")
  markConversationRead(data: { viewerUserId: string; conversationId: string }) {
    return this.messages.markConversationRead(data);
  }
}
```

Register `MessagesGrpcController` in `services/messages/src/app.module.ts`.

- [ ] **Step 3: Add BFF messages client and controller**

Add `messagesProtoPath` to `services/bff/src/proto-paths.ts`.

Register `MESSAGES_PACKAGE` in `services/bff/src/app.module.ts` with package `messages.v1`, proto path `messagesProtoPath`, and URL `process.env.MESSAGES_GRPC_URL ?? "127.0.0.1:50059"`. Add `MessagesController` to controllers and `MessagesClientService` to providers.

Create `services/bff/src/clients/messages.client.ts` with methods:

```ts
listConversations(viewerUserId: string, limit = 20, cursor?: string)
getConversation(viewerUserId: string, conversationId: string, limit = 30, beforeCursor?: string)
startConversation(viewerUserId: string, recipientUserId: string)
sendMessage(viewerUserId: string, conversationId: string, body: string)
markConversationRead(viewerUserId: string, conversationId: string)
```

Create `services/bff/src/messages.controller.ts`:

```ts
@Controller("messages")
export class MessagesController {
  constructor(
    @Inject(MessagesClientService) private readonly messagesClient: MessagesClientService,
    @Inject(SessionAuthService) private readonly sessionAuth: SessionAuthService,
    @Inject(UserSummaryService) private readonly userSummary: UserSummaryService,
  ) {}
}
```

Add endpoints:

- `GET "conversations"`
- `POST "conversations"`
- `GET "conversations/:conversationId"`
- `POST "conversations/:conversationId/messages"`
- `POST "conversations/:conversationId/read"`

Use `@Headers(sessionHeaderName)` and `this.sessionAuth.requireSession(sessionToken)` in every endpoint. Clamp list limits to `1..50` and message limits to `1..100`. Enrich `otherUser` and message `author` with `UserSummaryService.getUserSummaryById`.

- [ ] **Step 4: Verify BFF and messages gRPC**

Run:

```powershell
node --test --import tsx services/bff/src/messages.controller.test.ts
npm run typecheck -w @chirper/messages
npm run typecheck -w @chirper/bff
```

Expected: all commands pass.

- [ ] **Step 5: Commit gRPC and BFF API**

Run:

```powershell
git add services/messages/src/messages.grpc.controller.ts services/messages/src/app.module.ts services/bff/src/proto-paths.ts services/bff/src/app.module.ts services/bff/src/clients/messages.client.ts services/bff/src/messages.controller.ts services/bff/src/messages.controller.test.ts
git commit -m "feat: expose direct messages through bff"
```

## Task 5: Replace The Web Messages Mock

**Files:**
- Modify: `apps/web/lib/bff.ts`
- Modify: `apps/web/app/actions.ts`
- Modify: `apps/web/app/messages/page.tsx`
- Create: `apps/web/components/message-start-card.tsx`
- Create: `apps/web/lib/message-page-source.test.ts`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Write failing web source test**

Create `apps/web/lib/message-page-source.test.ts`:

```ts
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const pageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/messages/page.tsx"), "utf8");
const actionsSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/actions.ts"), "utf8");
const bffSource = fs.readFileSync(path.join(repoRoot, "apps/web/lib/bff.ts"), "utf8");

test("messages page uses BFF data instead of hard-coded mock conversations", () => {
  assert.match(pageSource, /getMessageConversations/);
  assert.match(pageSource, /getMessageConversation/);
  assert.doesNotMatch(pageSource, /Product design/);
  assert.doesNotMatch(pageSource, /Alana Pierce/);
  assert.doesNotMatch(pageSource, /Private reply preview/);
  assert.doesNotMatch(pageSource, /type="button"[\s\S]*Send/);
});

test("message actions call BFF message endpoints", () => {
  assert.match(actionsSource, /startConversationAction/);
  assert.match(actionsSource, /sendMessageAction/);
  assert.match(actionsSource, /markConversationReadAction/);
  assert.match(actionsSource, /\/api\/messages\/conversations/);
});

test("web bff helpers expose conversation and message APIs", () => {
  assert.match(bffSource, /export async function getMessageConversations/);
  assert.match(bffSource, /export async function getMessageConversation/);
  assert.match(bffSource, /export async function startMessageConversation/);
  assert.match(bffSource, /export async function sendMessage/);
});
```

Run: `node --test --import tsx apps/web/lib/message-page-source.test.ts`
Expected: FAIL because the page still contains static mock content.

- [ ] **Step 2: Add web BFF helpers and actions**

In `apps/web/lib/bff.ts`, add types:

```ts
export type MessageConversation = {
  conversationId: string;
  participantUserIds: string[];
  otherUserId: string;
  otherUser: UserSummary;
  lastMessageId: string;
  lastMessagePreview: string;
  lastMessageAuthorUserId: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DirectMessage = {
  messageId: string;
  conversationId: string;
  authorUserId: string;
  author: UserSummary;
  body: string;
  createdAt: string;
};
```

Add helpers:

- `getMessageConversations(sessionToken: string, limit = 20, cursor?: string)`
- `getMessageConversation(sessionToken: string, conversationId: string, limit = 30, beforeCursor?: string)`
- `startMessageConversation(sessionToken: string, recipientUserId: string)`
- `sendMessage(sessionToken: string, conversationId: string, body: string)`
- `markMessageConversationRead(sessionToken: string, conversationId: string)`

Follow existing `getNotifications` error fallback style.

In `apps/web/app/actions.ts`, add server actions:

```ts
export async function startConversationAction(formData: FormData) {
  const recipientUserId = String(formData.get("recipientUserId") ?? "").trim();
  const sessionToken = await getSessionToken();
  if (!sessionToken || !recipientUserId) {
    redirect("/messages");
  }
  const conversation = await startMessageConversation(sessionToken, recipientUserId);
  revalidatePath("/messages");
  redirect(`/messages?conversation=${encodeURIComponent(conversation.conversationId)}`);
}

export async function sendMessageAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sessionToken = await getSessionToken();
  const targetPath = conversationId ? `/messages?conversation=${encodeURIComponent(conversationId)}` : "/messages";
  if (!sessionToken || !conversationId || !body) {
    redirect(targetPath);
  }
  await sendMessage(sessionToken, conversationId, body);
  revalidatePath("/messages");
  redirect(targetPath);
}

export async function markConversationReadAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const sessionToken = await getSessionToken();
  if (sessionToken && conversationId) {
    await markMessageConversationRead(sessionToken, conversationId);
    revalidatePath("/messages");
  }
}
```

- [ ] **Step 3: Replace message page data loading**

Change `apps/web/app/messages/page.tsx` to accept:

```ts
type MessagesPageProps = {
  searchParams?: Promise<{ conversation?: string }>;
};
```

Load session, then:

```ts
const filters = await searchParams;
const conversationId = filters?.conversation?.trim() ?? "";
const envelope = await getMessageConversations(session.token, 20);
const selectedConversation = conversationId
  ? envelope.conversations.find((conversation) => conversation.conversationId === conversationId)
  : envelope.conversations[0];
const thread = selectedConversation
  ? await getMessageConversation(session.token, selectedConversation.conversationId, 30)
  : null;
```

Render conversation rows as `Link` elements to `/messages?conversation=<id>`, show `conversation.otherUser`, `lastMessagePreview || "No messages yet."`, unread badge, and formatted timestamp.

Render thread messages from `thread.messages`; apply `mine` when `message.authorUserId === session.viewer.userId`.

Use a real form:

```tsx
<form action={sendMessageAction} className="message-composer">
  <input name="conversationId" type="hidden" value={selectedConversation.conversationId} />
  <label className="field message-composer-field">
    <span>Message</span>
    <textarea name="body" placeholder={`Message @${selectedConversation.otherUser.handle}`} rows={3} />
  </label>
  <div className="message-composer-actions">
    <button className="primary-button compact" type="submit">Send</button>
  </div>
</form>
```

For empty inbox, render `<MessageStartCard />`.

- [ ] **Step 4: Add start conversation card**

Create `apps/web/components/message-start-card.tsx` as a client component based on `UserSearchCard`, but each result renders:

```tsx
<form action={startConversationAction}>
  <input name="recipientUserId" type="hidden" value={user.userId} />
  <button className="secondary-button compact" type="submit">Message</button>
</form>
```

Filter out users where `allowDirectInbox === false`.

- [ ] **Step 5: Verify web tests and typecheck**

Run:

```powershell
node --test --import tsx apps/web/lib/message-page-source.test.ts
npm run typecheck -w @chirper/web
```

Expected: both commands pass.

- [ ] **Step 6: Commit web chat replacement**

Run:

```powershell
git add apps/web/lib/bff.ts apps/web/app/actions.ts apps/web/app/messages/page.tsx apps/web/components/message-start-card.tsx apps/web/lib/message-page-source.test.ts apps/web/app/globals.css
git commit -m "feat: connect messages page to bff"
```

## Task 6: Add Helm Values And Environment Wiring

**Files:**
- Create: `infra/helm/values/local/messages.yaml`
- Create: `infra/helm/values/server/messages.yaml`
- Modify: `infra/helm/values/local/bff.yaml`
- Modify: `infra/helm/values/server/bff.yaml`
- Modify: `.env.example`

- [ ] **Step 1: Add messages Helm values**

Create `infra/helm/values/local/messages.yaml` and `infra/helm/values/server/messages.yaml`:

```yaml
nameOverride: messages
fullnameOverride: messages

image:
  repository: chirper/messages
  tag: dev

service:
  ports:
    - name: http
      port: 80
      targetPort: 4009
      containerPort: 4009
    - name: grpc
      port: 50059
      targetPort: 50059
      containerPort: 50059

env:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "4009"
  - name: GRPC_BIND_URL
    value: 0.0.0.0:50059
  - name: IDENTITY_GRPC_URL
    value: identity:50051
  - name: PROFILE_GRPC_URL
    value: profile:50052
  - name: GRAPH_GRPC_URL
    value: graph:50054

envFromSecrets:
  - chirper-database
```

- [ ] **Step 2: Add BFF messages gRPC env**

Add to both BFF values files:

```yaml
  - name: MESSAGES_GRPC_URL
    value: messages:50059
```

Add to `.env.example`:

```dotenv
MESSAGES_GRPC_URL=127.0.0.1:50059
```

- [ ] **Step 3: Verify scripts know messages service**

Run:

```powershell
npm run check:boundaries
powershell -ExecutionPolicy Bypass -File ./scripts/k8s-deploy.ps1 -Services messages -SkipImageBuild -SkipMigrations
```

Expected: `check:boundaries` passes. The deploy dry selection command may fail if kind is not running; if it fails only with `kind cluster 'chirper-local' does not exist`, continue and verify deployment in Task 7 on the available cluster.

- [ ] **Step 4: Commit infra wiring**

Run:

```powershell
git add infra/helm/values/local/messages.yaml infra/helm/values/server/messages.yaml infra/helm/values/local/bff.yaml infra/helm/values/server/bff.yaml .env.example scripts/k8s-deploy.ps1 scripts/k8s-build-images.ps1 service-boundaries.json package.json package-lock.json
git commit -m "feat: wire messages service deployment"
```

## Task 7: Full Verification, Deployment, Commit, Push

**Files:**
- Review all modified files from Tasks 1-6.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test --import tsx services/graph/src/graph.service.test.ts
node --test --import tsx services/messages/src/messages.service.test.ts
node --test --import tsx services/bff/src/messages.controller.test.ts
node --test --import tsx apps/web/lib/message-page-source.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run repository checks**

Run:

```powershell
npm run check
```

Expected: boundary check and all workspace typechecks pass.

- [ ] **Step 3: Inspect git state**

Run:

```powershell
git status --short --branch
git log --oneline -8
```

Expected: branch is ahead of `origin/main` with the feature commits and has no unstaged implementation changes.

- [ ] **Step 4: Deploy affected services**

Run the AGENTS.md-required deployment command for services affected by code changes:

```powershell
npm run k8s:deploy -- -Services messages,profile,graph,bff,web -SkipMigrations
```

Expected: image build and Helm rollout succeed for `messages`, `profile`, `graph`, `bff`, and `web`. The command intentionally skips migrations per project instruction; if the environment has not run `db:messages:migrate`, record that the deployment skipped migrations as requested.

- [ ] **Step 5: Push commits**

Run:

```powershell
git push origin main
```

Expected: push succeeds.

- [ ] **Step 6: Final response**

Report:

- New `messages` service and `msg_*` data model.
- BFF and web routes/actions connected.
- Policy checks wired through profile and graph.
- Exact tests run and their result.
- Deployment command result.
- Push result.
