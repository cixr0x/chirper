import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const homeComposerSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/components/home-composer.tsx"),
  "utf8",
);

test("home composer refreshes the current route after creating a post", () => {
  assert.match(homeComposerSource, /from "next\/navigation"/);
  assert.doesNotMatch(homeComposerSource, /from "react-dom"/);
  assert.match(homeComposerSource, /useRouter\(\)/);
  assert.match(homeComposerSource, /await action\(formData\)/);
  assert.match(homeComposerSource, /setBody\(""\);/);
  assert.match(homeComposerSource, /window\.requestAnimationFrame\(\(\) => \{\s*router\.refresh\(\);\s*\}\);/);
  assert.match(homeComposerSource, /router\.refresh\(\)/);
  assert.ok(
    homeComposerSource.indexOf('setBody("");') < homeComposerSource.indexOf("router.refresh();"),
    "Expected the composer text to be cleared before refreshing the route.",
  );
});
