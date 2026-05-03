# Direct Messages Design

## Purpose

Chirper's current `/messages` page is a static mock. This design turns it into working 1:1 direct messaging while preserving the existing service boundaries: durable chat state belongs to a new `messages` service, and `realtime` remains responsible only for delivery/fan-out.

## Scope

The first version supports only 1:1 conversations. Group chat, message edits, message deletion, attachments, reactions, typing indicators, presence, search within messages, and moderation tooling are out of scope.

Users may start a conversation with any non-blocked user whose profile allows direct inbox messages. This uses the existing profile `allowDirectInbox` setting, which must be exposed through the profile contract.

## Architecture

Add a new internal `messages` service that owns `msg_*` tables and exposes a `messages.v1` gRPC contract. The web app continues to call only the BFF. The BFF authenticates the viewer, calls `messages` over gRPC, and enriches conversation/message responses with identity and profile summaries.

The existing `realtime` service does not persist messages. It can later receive a chat-delivery event from `messages` and expose fresh-message polling or push delivery, but persisted history remains owned by `messages`.

Service ownership:

- `messages`: conversations, message history, read state, chat authorization.
- `bff`: HTTP edge API, viewer authentication, response enrichment.
- `web`: inbox UI, selected conversation UI, send/read actions.
- `profile`: exposes direct inbox policy.
- `graph`: exposes block policy.
- `realtime`: optional delivery notification for new messages.

## Data Model

`msg_conversations`

- `id VARCHAR(64)` primary key.
- `participant_low_user_id VARCHAR(64)` not null.
- `participant_high_user_id VARCHAR(64)` not null.
- `last_message_id VARCHAR(64)` nullable.
- `last_message_preview VARCHAR(180)` not null default empty.
- `last_message_author_user_id VARCHAR(64)` nullable.
- `last_message_at DATETIME(3)` nullable.
- `created_at DATETIME(3)` not null.
- `updated_at DATETIME(3)` not null.
- Unique key on `(participant_low_user_id, participant_high_user_id)`.
- Index on `(last_message_at, id)` for inbox ordering.

`msg_messages`

- `id VARCHAR(64)` primary key.
- `conversation_id VARCHAR(64)` not null.
- `author_user_id VARCHAR(64)` not null.
- `body VARCHAR(2000)` not null.
- `created_at DATETIME(3)` not null.
- Index on `(conversation_id, created_at, id)` for thread pagination.

`msg_conversation_reads`

- `id VARCHAR(64)` primary key.
- `conversation_id VARCHAR(64)` not null.
- `user_id VARCHAR(64)` not null.
- `last_read_message_id VARCHAR(64)` nullable.
- `last_read_at DATETIME(3)` nullable.
- `updated_at DATETIME(3)` not null.
- Unique key on `(conversation_id, user_id)`.

Conversation participants are canonicalized by sorting the two user IDs. This guarantees one row per user pair and prevents duplicate 1:1 conversations.

## gRPC Contract

Create `packages/contracts-proto/proto/messages/v1/messages.proto` with:

- `ListConversations(viewerUserId, limit, cursor)`
- `GetConversation(viewerUserId, conversationId, limit, beforeCursor)`
- `StartConversation(viewerUserId, recipientUserId)`
- `SendMessage(viewerUserId, conversationId, body)`
- `MarkConversationRead(viewerUserId, conversationId)`

Returned records should contain durable IDs, participant user IDs, timestamps, message previews, unread counts, and pagination cursors. The `messages` service returns user IDs only; BFF performs display-name, handle, and avatar enrichment through existing identity/profile clients.

## Authorization And Policy

The `messages` service validates all write and read operations:

- The viewer must be a participant to read, send, or mark a conversation read.
- The viewer cannot start a conversation with themselves.
- The recipient must exist.
- The recipient profile must have `allowDirectInbox = true`.
- Neither participant may have blocked the other.
- Empty or whitespace-only messages are rejected.
- Message bodies are limited to 2,000 characters.

Supporting contract changes:

- Add `allowDirectInbox` to `profile.v1.ProfileSummary`.
- Add a minimal graph gRPC method such as `HasBlockBetween(userIdA, userIdB)`.

## BFF API

Add authenticated BFF endpoints:

- `GET /api/messages/conversations`
- `POST /api/messages/conversations` with `recipientUserId`
- `GET /api/messages/conversations/:conversationId`
- `POST /api/messages/conversations/:conversationId/messages` with `body`
- `POST /api/messages/conversations/:conversationId/read`

The BFF uses the current session header flow, passes the viewer user ID to `messages`, and rejects unauthenticated requests. It enriches conversation rows and message authors so the web app does not need to make secondary calls.

## Web Behavior

Replace the static `/messages` mock data with real server-loaded data:

- Signed-out users continue to see the existing gate.
- Signed-in users see their real conversation list.
- The selected conversation is driven by `?conversation=<conversationId>` for the first version.
- Empty inbox shows a start-conversation surface backed by user search.
- Sending a message posts through a server action or route-backed form, clears the composer, and revalidates `/messages`.
- Opening a conversation marks it read after the thread loads.

The existing two-column message layout can stay. The implementation should remove the hard-coded "Product design" and "Alana Pierce" rows and the disabled send button.

## Realtime Delivery

Realtime delivery is not required for the first durable chat release. The first version may rely on post-send revalidation and normal page refreshes.

If included in a later step, `messages` should publish a chat-specific delivery event after `SendMessage`, and `realtime` should expose it as a generic or message-specific buffered event. That event must not become the source of truth for message history.

## Testing

Service tests:

- Canonical conversation creation produces one conversation per unordered pair.
- Duplicate starts return the existing conversation.
- Non-participants cannot read, send, or mark read.
- Blocked users and disabled direct inbox settings prevent new conversations.
- Message validation rejects empty and over-limit bodies.
- Read state updates unread counts.

BFF tests:

- Endpoints require a session.
- Viewer user ID is passed from the session, not request body.
- Conversation responses are enriched with participant summaries.
- Send and read endpoints call the expected gRPC methods.

Web tests:

- `/messages` no longer contains hard-coded mock conversations/messages.
- The send form targets the real action.
- Empty inbox and selected-conversation states render correctly.

## Deployment Impact

Affected services for implementation will be `messages`, `bff`, `web`, `profile`, and `graph`. If realtime delivery is added in the first implementation pass, `realtime` is also affected. Database migrations are required for the new `messages` service.
