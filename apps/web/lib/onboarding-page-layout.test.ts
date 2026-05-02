import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const onboardingPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/onboarding/page.tsx"), "utf8");

test("profile setup does not expose outbound profile link controls", () => {
  for (const removedCopy of ["Public links", "Optional outbound references", "any public links"]) {
    assert.equal(onboardingPageSource.includes(removedCopy), false, `Unexpected removed copy: ${removedCopy}`);
  }

  for (const removedControl of ["link-editor", 'name="linkLabel"', 'name="linkUrl"', "buildEditableLinkRows"]) {
    assert.equal(onboardingPageSource.includes(removedControl), false, `Unexpected removed control: ${removedControl}`);
  }
});

test("profile setup progress only counts remaining profile fields", () => {
  assert.equal(onboardingPageSource.includes("viewer.links.length > 0"), false);
  assert.match(onboardingPageSource, /<h2>\{completedCount\}\/4 complete<\/h2>/);
  assert.match(onboardingPageSource, /\{4 - completedCount\}/);
});

test("profile setup prefills existing avatar and banner URLs", () => {
  assert.match(
    onboardingPageSource,
    /defaultValue=\{viewer\.avatarUrl\}\s+name="avatarSourceUrl"/,
  );
  assert.match(
    onboardingPageSource,
    /defaultValue=\{viewer\.bannerUrl\}\s+name="bannerSourceUrl"/,
  );
});
