import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const profilePageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/u/[handle]/page.tsx"), "utf8");
const globalCssSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/globals.css"), "utf8");

test("profile editor does not expose outbound profile link controls", () => {
  for (const removedCopy of ["Profile links", "Outbound references"]) {
    assert.equal(profilePageSource.includes(removedCopy), false, `Unexpected removed copy: ${removedCopy}`);
  }

  for (const removedControl of ["link-editor", 'name="linkLabel"', 'name="linkUrl"']) {
    assert.equal(profilePageSource.includes(removedControl), false, `Unexpected removed control: ${removedControl}`);
  }
});

test("profile editor prefills existing avatar and banner URLs", () => {
  assert.match(
    profilePageSource,
    /defaultValue=\{user\.avatarUrl\}\s+name="avatarSourceUrl"/,
  );
  assert.match(
    profilePageSource,
    /defaultValue=\{user\.bannerUrl\}\s+name="bannerSourceUrl"/,
  );
});

test("profile page uses redesigned hero and editor layout without changing controls", () => {
  assert.match(profilePageSource, /showHeader=\{false\}/);

  for (const className of [
    "profile-hero-shell",
    "profile-banner-content",
    "profile-summary-card",
    "profile-primary-row",
    "profile-title-group",
    "profile-actions-card",
    "profile-editor-panel",
    "profile-editor-form",
  ]) {
    assert.match(profilePageSource, new RegExp(className));
  }

  for (const preservedControl of [
    "followeeUserId",
    "targetProfileHandle",
    "targetPath",
    "redirectTo",
    "successState",
    "bio",
    "location",
    "avatarSourceUrl",
    "bannerSourceUrl",
    "clearAvatar",
    "clearBanner",
  ]) {
    assert.match(profilePageSource, new RegExp(`name="${preservedControl}"`));
  }
});

test("profile redesign css keeps the banner compact and prevents cramped identity layout", () => {
  assert.match(globalCssSource, /\.profile-hero-shell\s*\{/);
  assert.match(globalCssSource, /\.banner-panel\s*\{[^}]*height: 156px;/s);
  assert.match(globalCssSource, /\.profile-summary-card\s*\{[^}]*grid-template-columns: auto minmax\(0, 1fr\);/s);
  assert.match(globalCssSource, /\.profile-actions-card\s*\{[^}]*justify-items: end;/s);
  assert.match(globalCssSource, /\.profile-stat-strip\s*\{[^}]*border-radius: 16px;/s);
  assert.match(globalCssSource, /\.profile-editor-panel\s*\{[^}]*background:/s);
});
