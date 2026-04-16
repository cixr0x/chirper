# Database Migrations

Chirper uses service-owned Flyway migrations for database changes. Each service has:

- its own SQL migration directory
- its own Flyway schema history table
- its own application Prisma schema

## Why

This keeps a shared MySQL database workable while preserving service boundaries. Every deployable service can evolve its own tables independently, and each environment records exactly which migrations were applied.

## Structure vs Data

Schema changes belong in Flyway migrations. Demo data, bootstrap data, or test fixtures should be applied through separate seed scripts so they do not become part of migration history and do not automatically promote to production.

Current seed commands:

```bash
npm run db:identity:seed:demo
npm run db:profile:seed:demo
npm run db:posts:seed:demo
```

Those scripts are intentionally outside Flyway history.

## Identity Example

- migrations directory: `services/identity/db/migrations`
- history table: `ident_schema_history`
- local env file: `services/identity/.env`

Commands from the repo root:

```bash
npm run db:identity:info
npm run db:identity:validate
npm run db:identity:migrate
```

Docker Desktop or another working Docker engine must be running, because the repo executes Flyway through the official container image.

To target another environment file:

```bash
node ./scripts/flyway-run.mjs --service identity --command migrate --env-file .env.prod
```

## Promotion Flow

1. Point `services/<service>/.env` at `chirper_test`.
2. Run `info`, `validate`, and `migrate`.
3. Verify schema and application behavior in test.
4. Point a prod-only env file at `chirper_prod`.
5. Run the same migration files against prod.

## Rules

- Never edit a migration after it has been applied.
- Add a new migration file for every schema change.
- Use one history table per service, e.g. `ident_schema_history`.
- Only the owning service may modify its prefixed tables.
- In a shared non-empty MySQL database, new services should baseline their own Flyway history table before applying their first migration.
