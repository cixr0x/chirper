import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AvatarBadge } from "../../../components/avatar-badge";
import { FeedList } from "../../../components/feed-list";
import { formatPostTimestamp, getPostLikes, getPostReposts, getPostThread } from "../../../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../../../lib/pagination";
import { getSessionState, getSessionToken } from "../../../lib/session";
import { formatParticipantHeading, formatThreadOverviewTimestamp } from "../../../lib/thread-detail-copy";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams?: Promise<{
    replyTrail?: string;
    likeTrail?: string;
    repostTrail?: string;
  }>;
};

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const { postId } = await params;
  const [filters, session, sessionToken] = await Promise.all([
    searchParams ? searchParams : Promise.resolve(undefined),
    getSessionState(),
    getSessionToken(),
  ]);
  const viewer = session?.viewer ?? null;
  const activeSessionToken = session ? sessionToken ?? undefined : undefined;
  const replyTrail = parseCursorTrail(filters?.replyTrail);
  const likeTrail = parseCursorTrail(filters?.likeTrail);
  const repostTrail = parseCursorTrail(filters?.repostTrail);
  const [threadResult, likesResult, repostsResult] = await Promise.all([
    collectPaginatedPages({
      trail: replyTrail,
      loadPage: (cursor) => getPostThread(postId, activeSessionToken, 6, cursor),
      getItems: (page) => page?.replies ?? [],
      getNextCursor: (page) => page?.nextReplyCursor ?? "",
    }),
    collectPaginatedPages({
      trail: likeTrail,
      loadPage: (cursor) => getPostLikes(postId, activeSessionToken, 6, cursor),
      getItems: (page) => page.items,
      getNextCursor: (page) => page.nextCursor,
    }),
    collectPaginatedPages({
      trail: repostTrail,
      loadPage: (cursor) => getPostReposts(postId, activeSessionToken, 6, cursor),
      getItems: (page) => page.items,
      getNextCursor: (page) => page.nextCursor,
    }),
  ]);
  const thread = threadResult.lastPage;

  if (!thread?.focus) {
    notFound();
  }

  const threadPath = `/p/${thread.focus.postId}`;
  const threadTargetPath = buildPathWithSearch(threadPath, filters);
  const participants = buildParticipantRows(thread, likesResult.items, repostsResult.items);
  const overviewTimestamp = formatThreadOverviewTimestamp(formatPostTimestamp(thread.focus.createdAt));

  return (
    <AppShell
      description="Follow the parent context, the focus post, and the reply chain in a single reading flow."
      eyebrow="Thread"
      rightRailClassName="thread-detail-rail"
      title="Conversation"
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card rail-card-accent">
            <div className="section-intro">
              <p className="eyebrow">Conversation</p>
              <h2>Thread overview</h2>
            </div>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{thread.focus.metrics.replyCount}</span>
                <span className="rail-metric-label">Replies</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{thread.focus.metrics.likeCount}</span>
                <span className="rail-metric-label">Likes</span>
              </div>
            </div>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{thread.focus.metrics.repostCount}</span>
                <span className="rail-metric-label">Reposts</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{participants.length}</span>
                <span className="rail-metric-label">People</span>
              </div>
            </div>
            <p className="section-copy thread-overview-meta">
              <span>Started by @{thread.focus.author?.handle ?? "unknown"}</span>
              <span aria-hidden="true">|</span>
              <span>{overviewTimestamp.date}</span>
              {overviewTimestamp.time ? (
                <>
                  <span aria-hidden="true">|</span>
                  <span className="thread-overview-time">{overviewTimestamp.time}</span>
                </>
              ) : null}
            </p>
          </section>

          <section className="rail-card">
            <div className="rail-heading-row">
              <div className="section-intro">
                <p className="eyebrow">Participants</p>
                <h2>{formatParticipantHeading(participants.length)}</h2>
              </div>
              <span className="follow-chip viewer">Thread</span>
            </div>
            {participants.length === 0 ? (
              <p className="muted-copy">No participants recorded yet.</p>
            ) : (
              <div className="engagement-stack">
                {participants.map((participant) => (
                  <article className="engagement-card" key={participant.userId}>
                    <div className="feed-head">
                      <AvatarBadge
                        avatarUrl={participant.avatarUrl}
                        displayName={participant.displayName}
                        size="small"
                      />
                      <div>
                        <h3>{participant.displayName}</h3>
                        <p className="handle">
                          <Link className="inline-link" href={`/u/${participant.handle}`}>
                            @{participant.handle}
                          </Link>
                        </p>
                      </div>
                    </div>
                    <div className="engagement-role-row">
                      {participant.roles.map((role) => (
                        <span className="engagement-role-chip" key={`${participant.userId}-${role}`}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Likes</p>
              <h2>{thread.focus.metrics.likeCount} total</h2>
            </div>
            <EngagementList emptyMessage="No likes yet." items={likesResult.items} />
            {likesResult.nextCursor ? (
              <div className="pagination-actions">
                <Link
                  className="inline-link"
                  href={appendCursorTrail(threadPath, filters, "likeTrail", likesResult.nextCursor)}
                >
                  Load more likes
                </Link>
              </div>
            ) : null}
          </section>

          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Reposts</p>
              <h2>{thread.focus.metrics.repostCount} total</h2>
            </div>
            <EngagementList emptyMessage="No reposts yet." items={repostsResult.items} />
            {repostsResult.nextCursor ? (
              <div className="pagination-actions">
                <Link
                  className="inline-link"
                  href={appendCursorTrail(threadPath, filters, "repostTrail", repostsResult.nextCursor)}
                >
                  Load more reposts
                </Link>
              </div>
            ) : null}
          </section>
        </>
      }
    >
      {thread.ancestors.length > 0 ? (
        <section className="panel timeline-panel thread-stage thread-stage-muted">
          <div className="section-intro thread-stage-head">
            <p className="eyebrow">Context</p>
            <h2>Posts leading into this conversation</h2>
            <p className="thread-stage-copy">
              Read upward from here if you want the setup before the focus post.
            </p>
          </div>
          <FeedList
            emptyBody=""
            emptyTitle=""
            items={thread.ancestors}
            targetPath={threadTargetPath}
            viewerHandle={viewer?.handle}
            viewerUserId={viewer?.userId}
          />
        </section>
      ) : null}

      <section className="panel timeline-panel thread-stage thread-focus-stage">
        <div className="section-intro thread-stage-head">
          <p className="eyebrow">Focus post</p>
          <h2>Conversation root</h2>
          <p className="thread-stage-copy">
            This is the post everyone in this thread is reacting to.
          </p>
        </div>
        <div className="thread-focus-summary">
          <span className="thread-focus-tag">@{thread.focus.author?.handle ?? "unknown"}</span>
          <span className="thread-focus-tag">{formatPostTimestamp(thread.focus.createdAt)}</span>
          <span className="thread-focus-tag">{thread.focus.metrics.replyCount} replies</span>
          <span className="thread-focus-tag">{thread.focus.metrics.likeCount} likes</span>
        </div>
        <FeedList
          deleteRedirectPath="/"
          emptyBody=""
          emptyTitle=""
          items={[thread.focus]}
          targetPath={threadTargetPath}
          currentPostId={thread.focus.postId}
          viewerHandle={viewer?.handle}
          viewerUserId={viewer?.userId}
        />
      </section>

      <section className="panel timeline-panel thread-stage">
        <div className="section-intro thread-stage-head">
          <p className="eyebrow">Replies</p>
          <h2>Direct responses</h2>
          <p className="thread-stage-copy">
            Direct replies stay here so the thread remains readable without nested branching.
          </p>
        </div>
        <FeedList
          emptyBody="No direct replies yet. Reply to the focus post to start the conversation."
          emptyTitle="No replies yet"
          items={threadResult.items}
          targetPath={threadTargetPath}
          viewerHandle={viewer?.handle}
          viewerUserId={viewer?.userId}
        />
        {thread.nextReplyCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail(threadPath, filters, "replyTrail", thread.nextReplyCursor)}
            >
              Load more replies
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function EngagementList({
  items,
  emptyMessage,
}: {
  items: Awaited<ReturnType<typeof getPostLikes>>["items"];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="muted-copy">{emptyMessage}</p>;
  }

  return (
    <div className="engagement-stack">
      {items.map((item) => (
        <article className="engagement-card" key={item.interactionId}>
          <div className="feed-head">
            <AvatarBadge avatarUrl={item.actor.avatarUrl} displayName={item.actor.displayName} size="small" />
            <div>
              <h3>{item.actor.displayName}</h3>
              <p className="handle">
                <Link className="inline-link" href={`/u/${item.actor.handle}`}>
                  @{item.actor.handle}
                </Link>{" "}
                | {formatPostTimestamp(item.createdAt)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function buildParticipantRows(
  thread: NonNullable<Awaited<ReturnType<typeof getPostThread>>>,
  likes: Awaited<ReturnType<typeof getPostLikes>>["items"],
  reposts: Awaited<ReturnType<typeof getPostReposts>>["items"],
) {
  const participantMap = new Map<
    string,
    {
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string;
      roles: Set<string>;
    }
  >();

  const upsert = (
    actor:
      | {
          userId: string;
          handle: string;
          displayName: string;
          avatarUrl: string;
        }
      | undefined,
    role: string,
  ) => {
    if (!actor) {
      return;
    }

    const existing = participantMap.get(actor.userId);
    if (existing) {
      existing.roles.add(role);
      return;
    }

    participantMap.set(actor.userId, {
      userId: actor.userId,
      handle: actor.handle,
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      roles: new Set([role]),
    });
  };

  upsert(thread.focus?.author, "Author");
  for (const reply of thread.replies) {
    upsert(reply.author, "Reply");
  }
  for (const like of likes) {
    upsert(like.actor, "Liked");
  }
  for (const repost of reposts) {
    upsert(repost.actor, "Reposted");
  }

  return [...participantMap.values()]
    .map((participant) => ({
      ...participant,
      roles: [...participant.roles],
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}
