import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const homePageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/page.tsx"), "utf8");

test("home timeline does not render the profile setup banner", () => {
  assert.equal(homePageSource.includes("needsProfileSetup"), false);
  assert.equal(homePageSource.includes("Complete your public profile before you settle into the timeline."), false);
  assert.equal(homePageSource.includes("Profile setup"), false);
});
