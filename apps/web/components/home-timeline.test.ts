import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const homeTimelineSourcePath = path.join(repoRoot, "apps/web/components/home-timeline.tsx");
const homeTimelineSource = fs.existsSync(homeTimelineSourcePath)
  ? fs.readFileSync(homeTimelineSourcePath, "utf8")
  : "";

test("home timeline prepends created posts before server feed projection catches up", () => {
  assert.match(homeTimelineSource, /"use client";/);
  assert.match(homeTimelineSource, /mergeCreatedFeedItems/);
  assert.match(homeTimelineSource, /onPostCreated=\{handlePostCreated\}/);
  assert.match(homeTimelineSource, /setCreatedItems\(\(current\) => mergeCreatedFeedItems\(\[item\], current\)\)/);
  assert.match(homeTimelineSource, /items=\{mergedFeedItems\}/);
});
