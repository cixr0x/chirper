import Link from "next/link";
import {
  createReplyAction,
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
  emptyTitle: string;
  emptyBody: string;
};

export function FeedList({ items, targetPath, viewerHandle, emptyTitle, emptyBody }: FeedListProps) {
  if (items.length === 0) {
    return (
      <article className="empty-card">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </article>
    );
  }

  return (
    <div className="feed-stack">
      {items.map((item) => (
        <article className="feed-card" key={`${item.activityType}-${item.postId}-${item.projectedAt ?? item.createdAt}`}>
          {item.activityType === "repost" && item.actor ? (
            <p className="activity-kicker">
              {item.actor.displayName} reposted this on {formatPostTimestamp(item.projectedAt ?? item.createdAt)}
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
                  {item.inReplyTo.postId}
                </Link>
              )}
            </p>
          ) : null}

          <div className="feed-head">
            <AvatarBadge
              avatarUrl={item.author?.avatarUrl}
              displayName={item.author?.displayName ?? "Unknown author"}
              size="small"
            />
            <div>
              <h3>{item.author?.displayName ?? "Unknown author"}</h3>
              <p className="handle">
                {item.author ? (
                  <Link className="inline-link" href={`/u/${item.author.handle}`}>
                    @{item.author.handle}
                  </Link>
                ) : (
                  "@unknown"
                )}{" "}
                | {formatPostTimestamp(item.createdAt)}
              </p>
            </div>
          </div>

          <p className="feed-body">{item.body}</p>

          <div className="feed-metrics">
            <span>{item.metrics.replyCount} replies</span>
            <span>{item.metrics.likeCount} likes</span>
            <span>{item.metrics.repostCount} reposts</span>
            <Link className="inline-link" href={`/p/${item.postId}`}>
              Open thread
            </Link>
          </div>

          {viewerHandle ? (
            <>
              <div className="feed-actions-row">
                <form action={item.metrics.likedByViewer ? unlikePostAction : likePostAction}>
                  <input name="postId" type="hidden" value={item.postId} />
                  <input name="targetPath" type="hidden" value={targetPath} />
                  <button className="secondary-button compact" type="submit">
                    {item.metrics.likedByViewer ? "Unlike" : "Like"}
                  </button>
                </form>

                <form action={item.metrics.repostedByViewer ? undoRepostAction : repostPostAction}>
                  <input name="postId" type="hidden" value={item.postId} />
                  <input name="targetPath" type="hidden" value={targetPath} />
                  <button className="secondary-button compact" type="submit">
                    {item.metrics.repostedByViewer ? "Undo repost" : "Repost"}
                  </button>
                </form>
              </div>

              <form action={createReplyAction} className="reply-form">
                <input name="postId" type="hidden" value={item.postId} />
                <input name="targetPath" type="hidden" value={targetPath} />
                <label className="field">
                  <span>Reply</span>
                  <textarea
                    maxLength={280}
                    name="body"
                    placeholder={`Reply to @${item.author?.handle ?? "unknown"}`}
                    required
                    rows={2}
                  />
                </label>
                <button className="primary-button compact" type="submit">
                  Reply
                </button>
              </form>
            </>
          ) : null}
        </article>
      ))}
    </div>
  );
}
