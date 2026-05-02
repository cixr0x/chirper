import type { FeedItem } from "./bff";

export function mergeCreatedFeedItems(createdItems: FeedItem[], serverItems: FeedItem[]) {
  const createdPostIds = new Set(createdItems.map((item) => item.postId));
  return [
    ...createdItems,
    ...serverItems.filter((item) => !createdPostIds.has(item.postId)),
  ];
}
