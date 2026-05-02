Commit and push any code changes after finishing the implementation.

Deploy any service affected by code changes using the following command:
npm run k8s:deploy -- -Services <services> -SkipMigrations
for example:
npm run k8s:deploy -- -Services web -SkipMigrations