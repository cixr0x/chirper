"use client";

import { useMemo, useState } from "react";
import type { FeedItem, FeedPage, UserSummary } from "../lib/bff";
import { mergeCreatedFeedItems } from "../lib/feed-item-merge";
import { FeedList } from "./feed-list";
import { HomeComposer } from "./home-composer";

type HomeTimelineProps = {
  action: (formData: FormData) => Promise<FeedItem | null>;
  emptyBody: string;
  emptyTitle: string;
  homeFeed: FeedPage;
  viewer: Pick<UserSummary, "avatarUrl" | "displayName" | "handle" | "userId">;
};

export function HomeTimeline({ action, emptyBody, emptyTitle, homeFeed, viewer }: HomeTimelineProps) {
  const [createdItems, setCreatedItems] = useState<FeedItem[]>([]);
  const mergedFeedItems = useMemo(
    () => mergeCreatedFeedItems(createdItems, homeFeed.items),
    [createdItems, homeFeed.items],
  );

  function handlePostCreated(item: FeedItem) {
    setCreatedItems((current) => mergeCreatedFeedItems([item], current));
  }

  return (
    <>
      <div className="timeline-composer-block">
        <HomeComposer action={action} onPostCreated={handlePostCreated} viewer={viewer} />
      </div>

      <div className="timeline-feed-block">
        <FeedList
          emptyBody={emptyBody}
          emptyTitle={emptyTitle}
          infinitePath="/api/feed"
          items={mergedFeedItems}
          nextCursor={homeFeed.nextCursor}
          pageSize={10}
          targetPath="/"
          viewerHandle={viewer.handle}
          viewerUserId={viewer.userId}
        />
      </div>
    </>
  );
}
