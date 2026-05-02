import assert from "node:assert/strict";
import test from "node:test";
import { mergeCreatedFeedItems } from "./feed-item-merge";
import type { FeedItem } from "./bff";

test("keeps newly created feed items ahead of the current server feed", () => {
  const created = feedItem("post_new", "New post");
  const existing = feedItem("post_existing", "Existing post");

  assert.deepEqual(mergeCreatedFeedItems([created], [existing]), [created, existing]);
});

test("does not duplicate a created item after the server feed includes it", () => {
  const created = feedItem("post_new", "New post");
  const existing = feedItem("post_existing", "Existing post");
  const serverCreated = feedItem("post_new", "New post from server");

  assert.deepEqual(mergeCreatedFeedItems([created], [serverCreated, existing]), [created, existing]);
});

function feedItem(postId: string, body: string): FeedItem {
  return {
    postId,
    body,
    visibility: "public",
    createdAt: "2026-05-02T00:00:00.000Z",
    activityType: "post",
    media: [],
    metrics: {
      postId,
      replyCount: 0,
      likeCount: 0,
      repostCount: 0,
      likedByViewer: false,
      repostedByViewer: false,
    },
  };
}
