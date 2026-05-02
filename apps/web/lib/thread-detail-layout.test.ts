import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const postPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/p/[postId]/page.tsx"), "utf8");
const globalCssSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/globals.css"), "utf8");

test("post detail route leads with the post instead of explanatory wrappers", () => {
  assert.match(postPageSource, /title="Post"/);
  assert.doesNotMatch(postPageSource, /description=/);
  assert.doesNotMatch(postPageSource, /eyebrow=/);

  for (const bulkyCopy of [
    "Posts leading into this conversation",
    "Read upward from here if you want the setup before the focus post.",
    "Focus post",
    "Conversation root",
    "This is the post everyone in this thread is reacting to.",
    "Direct responses",
    "Direct replies stay here so the thread remains readable without nested branching.",
  ]) {
    assert.equal(postPageSource.includes(bulkyCopy), false, `Unexpected bulky copy: ${bulkyCopy}`);
  }
});

test("thread detail rail starts aligned with the post page header", () => {
  const threadRailRule = globalCssSource.match(/\.social-rail-frame\.thread-detail-rail\s*\{[^}]*\}/);

  assert.ok(threadRailRule, "Expected thread detail rail CSS rule to exist.");
  assert.doesNotMatch(threadRailRule[0], /padding-top:\s*6rem/);
});
