import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const homeTimelineSourcePath = path.join(repoRoot, "apps/web/components/home-timeline.tsx");
const homeTimelineSource = fs.existsSync(homeTimelineSourcePath)
  ? fs.readFileSync(homeTimelineSourcePath, "utf8")
  : "";
const homePageSourcePath = path.join(repoRoot, "apps/web/app/page.tsx");
const homePageSource = fs.existsSync(homePageSourcePath) ? fs.readFileSync(homePageSourcePath, "utf8") : "";

test("home timeline prepends created posts before server feed projection catches up", () => {
  assert.match(homeTimelineSource, /"use client";/);
  assert.match(homeTimelineSource, /mergeCreatedFeedItems/);
  assert.match(homeTimelineSource, /onPostCreated=\{handlePostCreated\}/);
  assert.match(homeTimelineSource, /setCreatedItems\(\(current\) => mergeCreatedFeedItems\(\[item\], current\)\)/);
  assert.match(homeTimelineSource, /items=\{mergedFeedItems\}/);
});

test("home timeline right rail renders user search before other rail sections", () => {
  assert.match(homePageSource, /import \{ UserSearchCard \} from "\.\.\/components\/user-search-card";/);
  const searchCardIndex = homePageSource.indexOf("<UserSearchCard />");
  const forYouIndex = homePageSource.indexOf('<p className="eyebrow">For you</p>');

  assert.notEqual(searchCardIndex, -1);
  assert.notEqual(forYouIndex, -1);
  assert.ok(searchCardIndex < forYouIndex);
});
