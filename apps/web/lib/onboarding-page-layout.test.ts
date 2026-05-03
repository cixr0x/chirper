import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const onboardingPageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/onboarding/page.tsx"), "utf8");
const actionsSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/actions.ts"), "utf8");
const homePageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/page.tsx"), "utf8");
const profilePageSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/u/[handle]/page.tsx"), "utf8");
const primaryNavSource = fs.readFileSync(path.join(repoRoot, "apps/web/components/primary-nav.tsx"), "utf8");

test("onboarding route only redirects signed-in users to their profile", () => {
  assert.match(onboardingPageSource, /getSessionState\(\)/);
  assert.match(onboardingPageSource, /redirect\(`\/u\/\$\{session\.viewer\.handle\}`\)/);
  assert.match(onboardingPageSource, /redirect\("\/"\)/);
  assert.equal(onboardingPageSource.includes("<AppShell"), false);
  assert.equal(onboardingPageSource.includes("saveProfileAction"), false);
  assert.equal(onboardingPageSource.includes("Profile setup"), false);
});

test("registration redirects new users to their profile instead of onboarding", () => {
  assert.match(actionsSource, /redirect\(withSearchParams\(`\/u\/\$\{handle\}`,\s*\{ account: "registered" \}\)\)/s);
  assert.equal(actionsSource.includes('withSearchParams("/onboarding"'), false);
});

test("profile entry points link to the profile page rather than onboarding", () => {
  assert.equal(homePageSource.includes('href="/onboarding"'), false);
  assert.equal(homePageSource.includes("Finish onboarding"), false);

  assert.equal(profilePageSource.includes('href="/onboarding"'), false);
  assert.equal(profilePageSource.includes("Edit onboarding"), false);
  assert.equal(profilePageSource.includes("Open onboarding"), false);
});

test("navigation no longer treats onboarding as a selectable page", () => {
  assert.equal(primaryNavSource.includes('pathname === "/onboarding"'), false);
});
