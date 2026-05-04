import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const actionsSourcePath = path.join(repoRoot, "apps/web/app/actions.ts");
const bffSourcePath = path.join(repoRoot, "apps/web/lib/bff.ts");
const messagesPageSourcePath = path.join(repoRoot, "apps/web/app/messages/page.tsx");
const messageStartCardSourcePath = path.join(repoRoot, "apps/web/components/message-start-card.tsx");

const actionsSource = fs.existsSync(actionsSourcePath) ? fs.readFileSync(actionsSourcePath, "utf8") : "";
const bffSource = fs.existsSync(bffSourcePath) ? fs.readFileSync(bffSourcePath, "utf8") : "";
const messagesPageSource = fs.existsSync(messagesPageSourcePath) ? fs.readFileSync(messagesPageSourcePath, "utf8") : "";
const messageStartCardSource = fs.existsSync(messageStartCardSourcePath)
  ? fs.readFileSync(messageStartCardSourcePath, "utf8")
  : "";

test("messages page loads conversations and selected thread through BFF helpers", () => {
  assert.match(messagesPageSource, /getMessageConversations/);
  assert.match(messagesPageSource, /getMessageConversation/);
  assert.match(messagesPageSource, /searchParams/);
  assert.match(messagesPageSource, /compose/);
  assert.match(messagesPageSource, /\/messages\?compose=1/);
  assert.match(messagesPageSource, /getMessageConversation\(sessionToken,\s*requestedConversationId,\s*30\)/);
  assert.doesNotMatch(
    messagesPageSource,
    /conversations\.find\([^;]*requestedConversationId[^;]*\)\s*\?\?\s*conversations\[0\]/,
  );
  assert.doesNotMatch(messagesPageSource, /Product design/);
  assert.doesNotMatch(messagesPageSource, /Alana Pierce/);
  assert.doesNotMatch(messagesPageSource, /Private reply preview/);
  assert.doesNotMatch(messagesPageSource, /type="button"\s*>\s*Send/);
});

test("messages page wires read-on-open through the read marker component", () => {
  assert.match(messagesPageSource, /MessageReadMarker/);
  assert.match(messagesPageSource, /components\/message-read-marker/);
  assert.match(messagesPageSource, /<MessageReadMarker\s+conversationId=\{activeConversation\.conversationId\}/);
});

test("message compose entry points make the compose panel and people results actionable", () => {
  assert.match(messagesPageSource, /href="\/messages\?compose=1#message-compose"/);
  assert.match(messagesPageSource, /id="message-compose"/);
  assert.match(messageStartCardSource, /className="user-search-result-form"/);
  assert.match(messageStartCardSource, /className="user-search-result message-person-button"/);
  assert.doesNotMatch(messageStartCardSource, /<article className="user-search-result"/);
});

test("failed conversation starts return to compose with visible feedback", () => {
  assert.match(messagesPageSource, /error\?: string/);
  assert.match(messagesPageSource, /startErrorMessage/);
  assert.match(messagesPageSource, /startError=\{startErrorMessage\}/);
  assert.match(messageStartCardSource, /startError\?: string/);
  assert.match(messageStartCardSource, /\{startError \? <p className="muted-copy message-start-error">\{startError\}<\/p> : null\}/);
  assert.match(actionsSource, /redirect\("\/messages\?compose=1&error=start#message-compose"\)/);
});

test("message server actions call BFF message conversation helpers", () => {
  assert.match(actionsSource, /export async function startConversationAction/);
  assert.match(actionsSource, /export async function sendMessageAction/);
  assert.match(actionsSource, /export async function markConversationReadAction/);
  assert.match(actionsSource, /startMessageConversation/);
  assert.match(actionsSource, /sendMessage/);
  assert.match(actionsSource, /markMessageConversationRead/);
  assert.match(bffSource, /\/api\/messages\/conversations/);
});

test("web BFF exports direct message helpers", () => {
  assert.match(bffSource, /export async function getMessageConversations/);
  assert.match(bffSource, /export async function getMessageConversation/);
  assert.match(bffSource, /export async function startMessageConversation/);
  assert.match(bffSource, /export async function sendMessage/);
  assert.match(bffSource, /export async function markMessageConversationRead/);
});
