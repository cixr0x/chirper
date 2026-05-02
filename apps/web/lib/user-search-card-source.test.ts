import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const bffSourcePath = path.join(repoRoot, "apps/web/lib/bff.ts");
const searchCardSourcePath = path.join(repoRoot, "apps/web/components/user-search-card.tsx");

const bffSource = fs.existsSync(bffSourcePath) ? fs.readFileSync(bffSourcePath, "utf8") : "";
const searchCardSource = fs.existsSync(searchCardSourcePath) ? fs.readFileSync(searchCardSourcePath, "utf8") : "";

test("bff searchUsers helper calls the user search route with query and limit", () => {
  assert.match(bffSource, /export async function searchUsers/);
  assert.match(bffSource, /\/api\/users\/search/);
  assert.match(bffSource, /params\.set\("q", query\)/);
  assert.match(bffSource, /params\.set\("limit", String\(limit\)\)/);
});

test("user search card is a client component that fetches and links user results", () => {
  assert.match(searchCardSource, /"use client";/);
  assert.match(searchCardSource, /export function UserSearchCard/);
  assert.match(searchCardSource, /Search users/);
  assert.match(searchCardSource, /onSubmit=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(searchCardSource, /setTimeout/);
  assert.match(searchCardSource, /searchUsers\(trimmedQuery, 5\)/);
  assert.match(searchCardSource, /href=\{`\/u\/\$\{user\.handle\}`\}/);
  assert.match(searchCardSource, /<AvatarBadge/);
});
