import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const appShellSource = fs.readFileSync(path.join(repoRoot, "apps/web/components/app-shell.tsx"), "utf8");
const globalCssSource = fs.readFileSync(path.join(repoRoot, "apps/web/app/globals.css"), "utf8");
const mobileNavPath = path.join(repoRoot, "apps/web/components/mobile-nav-shell.tsx");

test("app shell wraps the sidebar in a mobile navigation controller", () => {
  assert.equal(fs.existsSync(mobileNavPath), true);
  assert.match(appShellSource, /import \{ MobileNavShell \} from "\.\/mobile-nav-shell";/);
  assert.match(appShellSource, /<MobileNavShell>/);
  assert.match(appShellSource, /<aside className="social-sidebar">/);
});

test("mobile navigation controller exposes a hamburger, overlay, and close behavior", () => {
  const mobileNavSource = fs.existsSync(mobileNavPath) ? fs.readFileSync(mobileNavPath, "utf8") : "";

  assert.match(mobileNavSource, /"use client";/);
  assert.match(mobileNavSource, /aria-label=\{isOpen \? "Close navigation" : "Open navigation"\}/);
  assert.match(mobileNavSource, /className="mobile-nav-toggle"/);
  assert.match(mobileNavSource, /className="mobile-nav-backdrop"/);
  assert.match(mobileNavSource, /social-sidebar-open/);
  assert.match(mobileNavSource, /onClickCapture: handleSidebarClick/);
});

test("mobile css hides the sidebar until the hamburger opens it", () => {
  assert.match(globalCssSource, /\.mobile-nav-toggle,\s*\.mobile-nav-backdrop\s*\{[^}]*display: none;/s);
  assert.match(globalCssSource, /@media \(max-width: 940px\)[\s\S]*\.mobile-nav-toggle\s*\{[\s\S]*display: inline-flex;/);
  assert.match(globalCssSource, /@media \(max-width: 940px\)[\s\S]*\.social-sidebar\s*\{[\s\S]*position: fixed;[\s\S]*transform: translateX\(calc\(-100% - 1rem\)\);/);
  assert.match(globalCssSource, /@media \(max-width: 940px\)[\s\S]*\.social-sidebar\.social-sidebar-open\s*\{[\s\S]*transform: translateX\(0\);/);
  assert.match(globalCssSource, /@media \(min-width: 941px\)[\s\S]*\.mobile-nav-backdrop\s*\{[\s\S]*display: none;/);
});
