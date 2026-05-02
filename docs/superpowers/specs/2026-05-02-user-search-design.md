# Timeline User Search Design

## Summary

Add user search to the home timeline right rail. Search is limited to users for now, appears as a dedicated card at the top of the right side panel, and matches both handles and display names.

## Goals

- Put search at the top of the timeline right rail so it is immediately discoverable.
- Search only users in this phase.
- Match case-insensitive partial text against normalized handles and display names.
- Return compact profile summaries that link to `/u/{handle}`.
- Keep the main timeline feed and composer behavior unchanged.

## Non-Goals

- Searching posts, replies, hashtags, or full profile bios.
- Creating a standalone search page.
- Adding ranking beyond exact, prefix, and partial handle/display-name matching.
- Changing follow/unfollow behavior in search results.

## User Experience

The signed-in home timeline renders a `UserSearchCard` as the first right-rail card. The card includes a labeled search input with the label "Search users" and a compact result area.

Empty input shows neutral helper copy. Queries shorter than two trimmed characters do not call the backend. Matching results show avatar, display name, `@handle`, and a `View` link to the profile. No matches show a concise empty state. Failed requests show a small error state and keep the rest of the rail usable.

Results are capped to five users by default to keep the rail stable. The viewer can appear in results if they match the query, because search is a directory lookup rather than a suggestion list.

## Architecture

Use backend-backed search rather than filtering the full directory in the browser.

Flow:

1. `UserSearchCard` in `apps/web` debounces client requests while the user types.
2. The card calls a web helper in `apps/web/lib/bff.ts`.
3. The helper calls BFF `GET /api/users/search?q=<query>&limit=<limit>`.
4. BFF delegates to `UserSummaryService.searchUsers(query, limit)`.
5. `UserSummaryService` calls the identity service search method, then enriches returned identities with existing profile summary data.
6. Identity searches the users table by case-insensitive partial handle or display name and returns ordered identity users.

## Backend Contract

Add an identity RPC:

- `SearchUsers(SearchUsersRequest) returns (SearchUsersResponse)`
- Request fields: `query`, `limit`
- Response field: repeated `IdentityUser users`

Add a BFF HTTP endpoint:

- `GET /api/users/search?q=<query>&limit=<limit>`
- Empty or too-short query returns `[]`.
- Limit is clamped between 1 and 10.
- Response shape reuses existing `UserSummary[]`.

Ordering is deterministic: exact handle matches first, then handle-prefix matches, then display-name-prefix matches, then remaining partial matches. Ties sort by handle ascending.

## Error Handling

The web helper returns an empty list on non-OK responses or network failures, consistent with existing BFF helper style. The client card can still maintain a local error state for failed fetches so users understand why results disappeared.

BFF should validate query and limit before calling identity. Identity should trim and normalize the query and avoid broad table scans for empty input.

## Testing

Use test-first implementation.

- Identity test: search returns users whose handles or display names contain the query, case-insensitively, and respects the limit.
- BFF test: user search delegates to identity search and returns enriched summaries.
- Web helper/client test: `searchUsers` calls the expected BFF route and handles empty/failure cases.
- Timeline source or component test: home right rail includes the dedicated user search card before the existing rail sections.

## Deployment

Affected services are:

- `identity` for the new RPC and database query.
- `bff` for the HTTP endpoint and summary orchestration.
- `web` for the timeline right rail UI.

After implementation and verification, deploy with:

```powershell
npm run k8s:deploy -- -Services identity,bff,web -SkipMigrations
```
