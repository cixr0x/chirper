"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createReplyAction,
  deletePostAction,
  likePostAction,
  repostPostAction,
  undoRepostAction,
  unlikePostAction,
} from "../app/actions";
import { type FeedItem, formatPostTimestamp } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type FeedListProps = {
  items: FeedItem[];
  targetPath: string;
  viewerHandle?: string | undefined;
  viewerUserId?: string | undefined;
  deleteRedirectPath?: string | undefined;
  emptyTitle: string;
  emptyBody: string;
  infinitePath?: string | undefined;
  nextCursor?: string | undefined;
  pageSize?: number | undefined;
};

type FeedPageResponse = {
  items: FeedItem[];
  nextCursor: string;
};

export function FeedList({
  items,
  targetPath,
  viewerHandle,
  viewerUserId,
  deleteRedirectPath,
  emptyTitle,
  emptyBody,
  infinitePath,
  nextCursor,
  pageSize = 10,
}: FeedListProps) {
  const [feedItems, setFeedItems] = useState(items);
  const [cursor, setCursor] = useState(nextCursor ?? "");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "complete">(
    nextCursor ? "idle" : "complete",
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setFeedItems(items);
    setCursor(nextCursor ?? "");
    setLoadState(nextCursor ? "idle" : "complete");
    loadingRef.current = false;
  }, [items, nextCursor]);

  async function loadMore() {
    if (!infinitePath || !cursor || loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    setLoadState("loading");

    try {
      const url = new URL(infinitePath, window.location.origin);
      url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", String(pageSize));

      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load more feed items.");
      }

      const payload = (await response.json()) as FeedPageResponse;
      setFeedItems((current) => [...current, ...payload.items]);
      setCursor(payload.nextCursor);
      setLoadState(payload.nextCursor ? "idle" : "complete");
    } catch {
      setLoadState("error");
    } finally {
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    if (!infinitePath || !cursor) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        rootMargin: "320px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, infinitePath]);

  if (feedItems.length === 0) {
    return (
      <article className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </article>
    );
  }

  return (
    <div className="feed-stack">
      {feedItems.map((item) => {
        const canDelete =
          Boolean(viewerUserId) &&
          item.activityType !== "repost" &&
          item.author?.userId === viewerUserId;

        return (
          <article className="feed-card" key={`${item.activityType}-${item.postId}-${item.projectedAt ?? item.createdAt}`}>
            {item.activityType === "repost" && item.actor ? (
              <p className="activity-kicker">
                {item.actor.displayName} reposted this | {formatPostTimestamp(item.projectedAt ?? item.createdAt)}
              </p>
            ) : null}

            {item.activityType === "reply" && item.inReplyTo ? (
              <p className="activity-kicker">
                Replying to{" "}
                {item.inReplyTo.author ? (
                  <Link className="inline-link" href={`/u/${item.inReplyTo.author.handle}`}>
                    @{item.inReplyTo.author.handle}
                  </Link>
                ) : (
                  <Link className="inline-link" href={`/p/${item.inReplyTo.postId}`}>
                    thread
                  </Link>
                )}
              </p>
            ) : null}

            <div className="feed-main-row">
              <AvatarBadge
                avatarUrl={item.author?.avatarUrl}
                displayName={item.author?.displayName ?? "Unknown author"}
                size="small"
              />

              <div className="feed-main-copy">
                <div className="feed-head">
                  <div className="feed-author-block">
                    <div className="feed-author-line">
                      <h3>{item.author?.displayName ?? "Unknown author"}</h3>
                      <span className="feed-author-handle">
                        {item.author ? (
                          <Link className="inline-link" href={`/u/${item.author.handle}`}>
                            @{item.author.handle}
                          </Link>
                        ) : (
                          "@unknown"
                        )}
                      </span>
                      <span className="feed-timestamp">{formatPostTimestamp(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {item.body ? <p className="feed-body">{item.body}</p> : null}

                {item.media.length > 0 ? (
                  <div className={`feed-media-grid feed-media-grid-${Math.min(item.media.length, 4)}`}>
                    {item.media.map((media, index) => (
                      <a
                        className="feed-media-card"
                        href={media.url}
                        key={`${item.postId}-${media.assetId}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {media.mimeType.startsWith("image/") ? (
                          <img
                            alt={`Attachment ${index + 1} on post ${item.postId}`}
                            className="feed-media-image"
                            src={media.url}
                          />
                        ) : (
                          <div className="feed-media-fallback">
                            <strong>Open attachment</strong>
                            <span>{media.mimeType || media.purpose}</span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="feed-meta-row">
                  <span>{item.metrics.replyCount} replies</span>
                  <span>{item.metrics.likeCount} likes</span>
                  <span>{item.metrics.repostCount} reposts</span>
                </div>

                {viewerHandle ? (
                  <>
                    <div className="feed-actions-row">
                      <details className="reply-disclosure">
                        <summary className="action-button">Reply</summary>
                        <form action={createReplyAction} className="reply-form">
                          <input name="postId" type="hidden" value={item.postId} />
                          <input name="targetPath" type="hidden" value={targetPath} />
                          <label className="field reply-field">
                            <span>Reply</span>
                            <textarea
                              maxLength={280}
                              name="body"
                              placeholder={`Reply to @${item.author?.handle ?? "unknown"}`}
                              rows={3}
                            />
                          </label>
                          <div className="reply-form-actions">
                            <label className="reply-media-field" htmlFor={`${item.postId}-reply-media`}>
                              <span>Optional image URL</span>
                              <input
                                id={`${item.postId}-reply-media`}
                                name="mediaSourceUrl"
                                placeholder="Paste one image URL"
                                type="url"
                              />
                            </label>
                            <button className="secondary-button compact" type="submit">
                              Reply
                            </button>
                          </div>
                        </form>
                      </details>

                      <form action={item.metrics.likedByViewer ? unlikePostAction : likePostAction}>
                        <input name="postId" type="hidden" value={item.postId} />
                        <input name="targetPath" type="hidden" value={targetPath} />
                        <button className="action-button" type="submit">
                          {item.metrics.likedByViewer ? "Unlike" : "Like"}
                        </button>
                      </form>

                      <form action={item.metrics.repostedByViewer ? undoRepostAction : repostPostAction}>
                        <input name="postId" type="hidden" value={item.postId} />
                        <input name="targetPath" type="hidden" value={targetPath} />
                        <button className="action-button" type="submit">
                          {item.metrics.repostedByViewer ? "Undo repost" : "Repost"}
                        </button>
                      </form>

                      <Link className="action-button action-link" href={`/p/${item.postId}`}>
                        Thread
                      </Link>

                      {canDelete ? (
                        <form action={deletePostAction}>
                          <input name="postId" type="hidden" value={item.postId} />
                          <input name="targetPath" type="hidden" value={targetPath} />
                          <input name="redirectPath" type="hidden" value={deleteRedirectPath ?? targetPath} />
                          <button className="action-button action-button-danger" type="submit">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="feed-actions-row">
                    <Link className="action-button action-link" href={`/p/${item.postId}`}>
                      Open thread
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {infinitePath ? (
        <div className="timeline-scroll-footer">
          {cursor ? <div className="timeline-scroll-sentinel" ref={sentinelRef} /> : null}
          {loadState === "loading" ? <p className="timeline-scroll-status">Loading more posts...</p> : null}
          {loadState === "error" ? (
            <button className="secondary-button compact" onClick={() => void loadMore()} type="button">
              Retry loading posts
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
