"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const interactiveSelector = "a,button,input,textarea,select,label,summary,form";

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
  const router = useRouter();
  const [feedItems, setFeedItems] = useState(items);
  const [cursor, setCursor] = useState(nextCursor ?? "");
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "complete">(
    nextCursor ? "idle" : "complete",
  );
  const [replyComposerPostId, setReplyComposerPostId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setFeedItems(items);
    setCursor(nextCursor ?? "");
    setLoadState(nextCursor ? "idle" : "complete");
    loadingRef.current = false;
  }, [items, nextCursor]);

  useEffect(() => {
    if (replyComposerPostId && !feedItems.some((item) => item.postId === replyComposerPostId)) {
      setReplyComposerPostId(null);
    }
  }, [feedItems, replyComposerPostId]);

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

  function shouldIgnoreCardNavigation(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest(interactiveSelector));
  }

  function openThread(postId: string) {
    router.push(`/p/${postId}`);
  }

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
        const canInteract = Boolean(viewerHandle);
        const isReplyComposerOpen = replyComposerPostId === item.postId;

        return (
          <article
            className="feed-card feed-card-clickable"
            key={`${item.activityType}-${item.postId}-${item.projectedAt ?? item.createdAt}`}
            onClick={(event) => {
              if (shouldIgnoreCardNavigation(event.target)) {
                return;
              }

              openThread(item.postId);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              if (shouldIgnoreCardNavigation(event.target)) {
                return;
              }

              event.preventDefault();
              openThread(item.postId);
            }}
            role="link"
            tabIndex={0}
          >
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
                  "thread"
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
                      <h3 className="feed-author-name">{item.author?.displayName ?? "Unknown author"}</h3>
                      <p className="feed-author-meta">
                        <span className="feed-author-handle">
                          {item.author ? (
                            <Link className="inline-link" href={`/u/${item.author.handle}`}>
                              @{item.author.handle}
                            </Link>
                          ) : (
                            "@unknown"
                          )}
                        </span>
                        <span className="feed-author-separator" aria-hidden="true">
                          ·
                        </span>
                        <span className="feed-timestamp">{formatPostTimestamp(item.createdAt)}</span>
                      </p>
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

                <div className="feed-actions-bar">
                  {canInteract ? (
                    <>
                      <button
                        aria-expanded={isReplyComposerOpen}
                        className={`feed-action feed-action-reply ${isReplyComposerOpen ? "active" : ""}`}
                        onClick={() =>
                          setReplyComposerPostId((current) => (current === item.postId ? null : item.postId))
                        }
                        type="button"
                      >
                        <ReplyIcon />
                        <span>{formatCompactCount(item.metrics.replyCount)}</span>
                      </button>

                      <form action={item.metrics.repostedByViewer ? undoRepostAction : repostPostAction}>
                        <input name="postId" type="hidden" value={item.postId} />
                        <input name="targetPath" type="hidden" value={targetPath} />
                        <button
                          className={`feed-action feed-action-repost ${item.metrics.repostedByViewer ? "active" : ""}`}
                          type="submit"
                        >
                          <RepostIcon />
                          <span>{formatCompactCount(item.metrics.repostCount)}</span>
                        </button>
                      </form>

                      <form action={item.metrics.likedByViewer ? unlikePostAction : likePostAction}>
                        <input name="postId" type="hidden" value={item.postId} />
                        <input name="targetPath" type="hidden" value={targetPath} />
                        <button
                          className={`feed-action feed-action-like ${item.metrics.likedByViewer ? "active" : ""}`}
                          type="submit"
                        >
                          <LikeIcon />
                          <span>{formatCompactCount(item.metrics.likeCount)}</span>
                        </button>
                      </form>

                      {canDelete ? (
                        <form action={deletePostAction} className="feed-action-trailing">
                          <input name="postId" type="hidden" value={item.postId} />
                          <input name="targetPath" type="hidden" value={targetPath} />
                          <input name="redirectPath" type="hidden" value={deleteRedirectPath ?? targetPath} />
                          <button className="feed-action feed-action-delete" type="submit">
                            <DeleteIcon />
                          </button>
                        </form>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button className="feed-action feed-action-reply" onClick={() => router.push("/")} type="button">
                        <ReplyIcon />
                        <span>{formatCompactCount(item.metrics.replyCount)}</span>
                      </button>
                      <button className="feed-action feed-action-repost" onClick={() => router.push("/")} type="button">
                        <RepostIcon />
                        <span>{formatCompactCount(item.metrics.repostCount)}</span>
                      </button>
                      <button className="feed-action feed-action-like" onClick={() => router.push("/")} type="button">
                        <LikeIcon />
                        <span>{formatCompactCount(item.metrics.likeCount)}</span>
                      </button>
                    </>
                  )}
                </div>

                {canInteract && isReplyComposerOpen ? (
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
                ) : null}
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

function formatCompactCount(value: number) {
  if (value >= 1_000_000) {
    return `${trimTrailingZero((value / 1_000_000).toFixed(1))}M`;
  }

  if (value >= 1_000) {
    return `${trimTrailingZero((value / 1_000).toFixed(1))}K`;
  }

  return String(value);
}

function trimTrailingZero(value: string) {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

function ReplyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M3.34 14.5a1 1 0 0 1 .32-1.09l7-6.5a1 1 0 0 1 1.67.73v3.07c5.4.08 8.95 2.01 10.83 5.89a1 1 0 0 1-1.45 1.24c-2.35-1.62-4.88-2.34-9.38-2.34v3.14a1 1 0 0 1-1.67.74l-7-6.5a1 1 0 0 1-.32-.38Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4.75 7.5 8 4.25 11.25 7.5H9v4.25H6.5V7.5H4.75Zm8.75 4.75h2.5V16.5h2.25L15 19.75 11.75 16.5H14v-4.25Zm-6.25 5h7.25v2.5H7.25A2.25 2.25 0 0 1 5 17.5v-2h2.25v1.75Zm9.5-12H9.5v-2.5h7.25A2.25 2.25 0 0 1 19 5v2h-2.25V5.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.76 0 3.46.81 4.5 2.09C13.04 3.81 14.74 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.52L12 21.35Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 3.75h6a1 1 0 0 1 1 1V6h4v2h-1v10.25A2.75 2.75 0 0 1 16.25 21h-8.5A2.75 2.75 0 0 1 5 18.25V8H4V6h4V4.75a1 1 0 0 1 1-1Zm1 2.25h4v-.25h-4V6Zm-2.5 2v10.25c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25V8h-9ZM10 10h2v6h-2v-6Zm4 0h2v6h-2v-6Z"
        fill="currentColor"
      />
    </svg>
  );
}
