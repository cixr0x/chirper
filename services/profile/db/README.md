# Profile DB Migrations

This service uses Flyway for logged, incremental SQL migrations.

## Commands

From the repo root:

```bash
npm run db:profile:info
npm run db:profile:migrate
npm run db:profile:validate
```

Docker Desktop must be running locally because Flyway is executed through the official Docker image.

## Conventions

- One migration history table per service: `profile_schema_history`
- Never edit an applied migration
- Promote the same SQL file from `chirper_test` to `chirper_prod`
- Only `profile` may create or alter `profile_*` tables

