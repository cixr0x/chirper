# Posts DB Migrations

This service uses Flyway for logged, incremental SQL migrations.

## Commands

From the repo root:

```bash
npm run db:posts:info
npm run db:posts:migrate
npm run db:posts:validate
```

Docker Desktop must be running locally because Flyway is executed through the official Docker image.

## Conventions

- One migration history table per service: `posts_schema_history`
- Never edit an applied migration
- Promote the same SQL file from `chirper_test` to `chirper_prod`
- Only `posts` may create or alter `posts_*` tables

