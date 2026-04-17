# Chirper

Chirper is a service-oriented Twitter-clone exercise built as a monorepo. Services are independently deployable, but all MySQL tables live in a single database and must follow strict ownership rules.

## Current Scaffold

- `apps/web`: Next.js frontend
- `services/bff`: public edge API that will aggregate internal services
- `services/identity`: auth and account ownership service
- `services/profile`: user profile service
- `services/graph`: planned follow/block/mute service
- `services/posts`: planned posts, likes, reposts service
- `services/timeline`: planned feed read-model service
- `services/notifications`: planned notifications service
- `services/media`: planned upload and asset service
- `services/realtime`: planned live delivery service
- `packages/contracts-proto`: gRPC contracts
- `packages/contracts-events`: event topic definitions
- `packages/common`: shared non-domain utility types

## Architecture Rule

Each database-owning service has a readable 5-8 character table prefix. No service may read or write a table it does not own.

Examples:

- `ident_users`
- `profile_profiles`
- `posts_posts`
- `timeline_home_entries`
- `notify_notifications`

Run the ownership validation with:

```bash
npm run check:boundaries
```

Database migrations are tracked per service with Flyway. See [docs/database-migrations.md](/C:/PROJECTS/chirper/docs/database-migrations.md).

See [docs/architecture.md](/C:/PROJECTS/chirper/docs/architecture.md) for the service map and boundary conventions.

## Local Development

Start the current local stack with:

```bash
npm run dev:identity
npm run dev:profile
npm run dev:posts
npm run dev:graph
npm run dev:timeline
npm run dev:notifications
npm run dev:realtime
npm run dev:bff
npm run dev:web
```

## Local Kubernetes

Local Kubernetes deployability is scaffolded around `kind`, `helm`, and the generic chart at [infra/helm/chirper-service](/C:/PROJECTS/chirper/infra/helm/chirper-service).

Bootstrap the cluster and ingress:

```powershell
npm run k8s:bootstrap
```

Build the local images and load them into `kind`:

```powershell
npm run k8s:build-images
```

Deploy the stack into the `chirper` namespace:

```powershell
npm run k8s:deploy -- -SeedDemo
```

See [docs/local-kubernetes.md](/C:/PROJECTS/chirper/docs/local-kubernetes.md) for the full flow and URLs.
