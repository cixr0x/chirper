# Identity DB Migrations

This service uses Flyway for logged, incremental SQL migrations.

## Commands

From the repo root:

```bash
npm run db:identity:info
npm run db:identity:migrate
npm run db:identity:validate
```

Docker Desktop must be running locally because Flyway is executed through the official Docker image.

The commands read `services/identity/.env` by default. To point Flyway at a different environment file:

```bash
node ./scripts/flyway-run.mjs --service identity --command info --env-file .env.prod
node ./scripts/flyway-run.mjs --service identity --command migrate --env-file .env.prod
```

## Conventions

- One migration history table per service: `ident_schema_history`
- Never edit an applied migration
- Promote the same SQL file from `chirper_test` to `chirper_prod`
- Only `identity` may create or alter `ident_*` tables
