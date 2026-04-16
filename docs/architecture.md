# Architecture

## Deployment Model

- Monorepo with independently deployable services
- One shared MySQL database instance
- No cross-service table access
- Public traffic reaches only `web` and `bff`
- Internal request/response uses gRPC
- Internal asynchronous communication uses Kafka
- Redis is reserved for cache, fan-out buffers, and ephemeral state

## Prefix Ownership Convention

| Service | Prefix | Notes |
| --- | --- | --- |
| `identity` | `ident` | Users, credentials, sessions, outbox |
| `profile` | `profile` | Public profile, settings, links |
| `graph` | `graph` | Follows, blocks, mutes |
| `posts` | `posts` | Posts, likes, reposts, post-media links |
| `timeline` | `timeline` | Home feed and user feed projections |
| `notifications` | `notify` | Notifications, preferences, delivery state |
| `media` | `media` | Uploads, asset metadata, variants |
| `realtime` | `realtime` | Optional persistent delivery state if needed |

Rules:

1. Only the owning service may touch tables with its prefix.
2. No cross-service foreign keys.
3. No cross-service joins.
4. Cross-service data moves by gRPC calls or events, never by SQL access.
5. Read models belong to the service that stores them, even if sourced from foreign events.

## Initial Service Map

### `web`

- Next.js application
- Renders the UI
- Calls only the `bff`

### `bff`

- Edge HTTP API for the web app
- Aggregates identity/profile data over gRPC
- No table ownership

### `identity`

- Owns accounts and credentials
- Future auth/session issuance
- Current starter tables:
  - `ident_users`
  - `ident_credentials`
  - `ident_sessions`
  - `ident_outbox`

### `profile`

- Owns display profile data
- Current starter tables:
  - `profile_profiles`
  - `profile_settings`
  - `profile_profile_links`
  - `profile_outbox`

### `graph`

- Owns social graph relationships
- Planned starter tables:
  - `graph_follows`
  - `graph_blocks`
  - `graph_mutes`
  - `graph_outbox`

### `posts`

- Owns user-generated posts, likes, reposts
- Planned starter tables:
  - `posts_posts`
  - `posts_likes`
  - `posts_reposts`
  - `posts_post_media`
  - `posts_outbox`

### `timeline`

- Owns feed read models
- Planned starter tables:
  - `timeline_home_entries`
  - `timeline_user_entries`
  - `timeline_rank_state`
  - `timeline_inbox`

### `notifications`

- Owns notification state
- Planned starter tables:
  - `notify_notifications`
  - `notify_preferences`
  - `notify_delivery_attempts`
  - `notify_inbox`

### `media`

- Owns upload metadata
- Planned starter tables:
  - `media_uploads`
  - `media_assets`
  - `media_variants`
  - `media_outbox`

### `realtime`

- Push delivery and connection fan-out
- Prefer ephemeral state in Redis/NATS
- MySQL state should remain optional and `realtime_*` prefixed if introduced

## Evolution Path

1. Build `web`, `bff`, `identity`, and `profile`.
2. Add `graph` and `posts`.
3. Add event-driven `timeline`.
4. Add `notifications`, `media`, and `realtime`.
5. Add search, observability hardening, rollout policies, and canaries.
