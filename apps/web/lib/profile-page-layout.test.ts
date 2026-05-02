import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const profilePageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/u/[handle]/page.tsx"), "utf8");

test("profile editor does not expose outbound profile link controls", () => {
  for (const removedCopy of ["Profile links", "Outbound references"]) {
    assert.equal(profilePageSource.includes(removedCopy), false, `Unexpected removed copy: ${removedCopy}`);
  }

  for (const removedControl of ["link-editor", 'name="linkLabel"', 'name="linkUrl"']) {
    assert.equal(profilePageSource.includes(removedControl), false, `Unexpected removed control: ${removedControl}`);
  }
});
