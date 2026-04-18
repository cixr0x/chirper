import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AvatarBadge } from "../../../components/avatar-badge";
import { FeedList } from "../../../components/feed-list";
import { formatPostTimestamp, getPostLikes, getPostReposts, getPostThread } from "../../../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../../../lib/pagination";
import { getSessionState, getSessionToken } from "../../../lib/session";

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

  return (
    <AppShell
      description="Follow the parent context, the focus post, and the reply chain in a single reading flow."
      eyebrow="Thread"
      title="Conversation"
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Participants</p>
              <h2>{participants.length} people involved</h2>
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
                    <p className="engagement-copy">{participant.roles.join(" | ")}</p>
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
        <section className="panel timeline-panel">
          <div className="section-intro">
            <p className="eyebrow">Context</p>
            <h2>Posts leading into this conversation</h2>
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

      <section className="panel timeline-panel">
        <div className="section-intro">
          <p className="eyebrow">Focus post</p>
          <h2>Thread starter</h2>
        </div>
        <FeedList
          deleteRedirectPath="/"
          emptyBody=""
          emptyTitle=""
          items={[thread.focus]}
          targetPath={threadTargetPath}
          viewerHandle={viewer?.handle}
          viewerUserId={viewer?.userId}
        />
      </section>

      <section className="panel timeline-panel">
        <div className="section-intro">
          <p className="eyebrow">Replies</p>
          <h2>Direct responses</h2>
        </div>
        <FeedList
          emptyBody="No direct replies yet. Use the reply composer on the focus post to start the conversation."
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
