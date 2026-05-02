# Timeline User Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-only search to the top of the home timeline right rail.

**Architecture:** Identity owns user lookup and exposes a search RPC. BFF exposes an HTTP search endpoint and enriches identity records with existing profile summary data. The web app renders a client `UserSearchCard` in the first right-rail position and calls BFF through `apps/web/lib/bff.ts`.

**Tech Stack:** TypeScript, Node test runner, NestJS controllers/services, gRPC proto contracts, Prisma, Next.js React client components.

---

### Task 1: Identity Search

**Files:**
- Modify: `packages/contracts-proto/proto/identity/v1/identity.proto`
- Modify: `services/identity/src/identity-directory.service.ts`
- Modify: `services/identity/src/identity.grpc.controller.ts`
- Create: `services/identity/src/identity-directory.service.test.ts`

- [ ] **Step 1: Write the failing identity test**

Create a Node test that constructs `IdentityDirectoryService` with a fake Prisma user client and asserts:

```ts
const results = await directory.searchUsers("al", 5);
assert.deepEqual(results.map((user) => user.handle), ["alana", "alex", "sally"]);
```

The fake user client must include handles/display names that verify exact, prefix, display-name prefix, partial, case-insensitive matching, and limit behavior.

- [ ] **Step 2: Run identity test to verify RED**

Run: `node --test --import tsx services/identity/src/identity-directory.service.test.ts`

Expected: FAIL because `directory.searchUsers` is not defined.

- [ ] **Step 3: Implement identity search**

Add `SearchUsers` to the identity proto. Add `searchUsers(query: string, limit: number)` to `IdentityDirectoryService`, fetching candidate users from Prisma with a case-insensitive `contains` OR on `handle` and `displayName`, ordering deterministically in TypeScript by exact handle, handle prefix, display-name prefix, partial match, then handle. Clamp limit to 1-10 and return `[]` for trimmed queries shorter than 2.

- [ ] **Step 4: Expose identity RPC**

Add `@GrpcMethod("IdentityService", "SearchUsers")` to `IdentityGrpcController` and return `{ users }`.

- [ ] **Step 5: Run identity test to verify GREEN**

Run: `node --test --import tsx services/identity/src/identity-directory.service.test.ts`

Expected: PASS.

### Task 2: BFF Search Endpoint

**Files:**
- Modify: `services/bff/src/clients/identity.client.ts`
- Modify: `services/bff/src/user-summary.service.ts`
- Modify: `services/bff/src/users.controller.ts`
- Create: `services/bff/src/user-summary.service.test.ts`
- Create: `services/bff/src/users.controller.test.ts`

- [ ] **Step 1: Write failing BFF service/controller tests**

Assert `UserSummaryService.searchUsers("al", 5)` calls identity search, enriches returned identities through profile lookup, and returns `UserSummary[]`. Assert `UsersController.searchUsers("al", "5")` delegates to `userSummaryService.searchUsers("al", 5)` and too-short queries return `[]`.

- [ ] **Step 2: Run BFF tests to verify RED**

Run: `node --test --import tsx services/bff/src/user-summary.service.test.ts services/bff/src/users.controller.test.ts`

Expected: FAIL because `searchUsers` methods are not defined.

- [ ] **Step 3: Implement BFF client/service/controller**

Add `searchUsers` to `IdentityClientService` and the internal gRPC service type. Add `UserSummaryService.searchUsers(query, limit)` and the BFF route `GET /api/users/search?q=<query>&limit=<limit>` before parameterized user routes.

- [ ] **Step 4: Run BFF tests to verify GREEN**

Run: `node --test --import tsx services/bff/src/user-summary.service.test.ts services/bff/src/users.controller.test.ts`

Expected: PASS.

### Task 3: Web Helper and Search Card

**Files:**
- Modify: `apps/web/lib/bff.ts`
- Create: `apps/web/components/user-search-card.tsx`
- Create: `apps/web/lib/user-search-card-source.test.ts`

- [ ] **Step 1: Write failing web source tests**

Add a source-level test that asserts `apps/web/lib/bff.ts` exports `searchUsers` and calls `/api/users/search`, and `user-search-card.tsx` includes the client directive, the `Search users` label, debounced fetch behavior, and links results to `/u/${user.handle}`.

- [ ] **Step 2: Run web tests to verify RED**

Run: `node --test apps/web/lib/user-search-card-source.test.ts`

Expected: FAIL because the helper/component do not exist.

- [ ] **Step 3: Implement web helper and component**

Add `searchUsers(query, limit = 5)` in `apps/web/lib/bff.ts`. Implement `UserSearchCard` as a client component with a controlled input, debounce timer, loading state, empty state, error state, avatar badges, and profile links.

- [ ] **Step 4: Run web tests to verify GREEN**

Run: `node --test apps/web/lib/user-search-card-source.test.ts`

Expected: PASS.

### Task 4: Timeline Integration and Styling

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/home-timeline.test.ts`

- [ ] **Step 1: Write failing timeline placement test**

Update the source-level home timeline test to assert `UserSearchCard` is imported and rendered before the first existing right-rail section.

- [ ] **Step 2: Run placement test to verify RED**

Run: `node --test apps/web/components/home-timeline.test.ts`

Expected: FAIL because `UserSearchCard` is not imported/rendered.

- [ ] **Step 3: Integrate and style**

Import `UserSearchCard` in `apps/web/app/page.tsx` and render it as the first `rightRail` child. Add CSS classes for `.user-search-card`, `.user-search-form`, `.user-search-input`, `.user-search-results`, `.user-search-result`, and related states using the existing rail rhythm.

- [ ] **Step 4: Run placement test to verify GREEN**

Run: `node --test apps/web/components/home-timeline.test.ts`

Expected: PASS.

### Task 5: Verification, Commit, Push

**Files:**
- All changed files.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
node --test --import tsx services/identity/src/identity-directory.service.test.ts
node --test --import tsx services/bff/src/user-summary.service.test.ts services/bff/src/users.controller.test.ts
node --test apps/web/lib/user-search-card-source.test.ts apps/web/components/home-timeline.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run typechecks**

Run:

```powershell
npm run typecheck -w @chirper/identity
npm run typecheck -w @chirper/bff
npm run typecheck -w @chirper/web
```

Expected: all typechecks exit 0.

- [ ] **Step 3: Do not deploy locally**

Per user instruction, skip `npm run k8s:deploy`. The user will deploy and verify in the VM with Jenkins.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git add packages/contracts-proto/proto/identity/v1/identity.proto services/identity/src/identity-directory.service.ts services/identity/src/identity.grpc.controller.ts services/identity/src/identity-directory.service.test.ts services/bff/src/clients/identity.client.ts services/bff/src/user-summary.service.ts services/bff/src/users.controller.ts services/bff/src/user-summary.service.test.ts services/bff/src/users.controller.test.ts apps/web/lib/bff.ts apps/web/components/user-search-card.tsx apps/web/lib/user-search-card-source.test.ts apps/web/app/page.tsx apps/web/app/globals.css apps/web/components/home-timeline.test.ts docs/superpowers/plans/2026-05-02-user-search.md
git commit -m "Add timeline user search"
git push
```
