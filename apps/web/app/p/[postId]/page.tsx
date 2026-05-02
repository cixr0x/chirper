import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AvatarBadge } from "../../../components/avatar-badge";
import { FeedList } from "../../../components/feed-list";
import { formatPostTimestamp, getPostThread } from "../../../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../../../lib/pagination";
import { getSessionState, getSessionToken } from "../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams?: Promise<{
    replyTrail?: string;
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
  const threadResult = await collectPaginatedPages({
    trail: replyTrail,
    loadPage: (cursor) => getPostThread(postId, activeSessionToken, 8, cursor),
    getItems: (page) => page?.replies ?? [],
    getNextCursor: (page) => page?.nextReplyCursor ?? "",
  });
  const thread = threadResult.lastPage;

  if (!thread?.focus) {
    notFound();
  }

  const threadPath = `/p/${thread.focus.postId}`;
  const threadTargetPath = buildPathWithSearch(threadPath, filters);
  const participants = buildParticipantRows(thread);
  const visibleParticipants = participants.slice(0, 4);
  const author = thread.focus.author;
  const postedAt = formatPostTimestamp(thread.focus.createdAt);

  return (
    <AppShell
      rightRailClassName="thread-detail-rail"
      title="Post"
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card thread-side-card">
            <div className="section-intro thread-rail-heading">
              <h2>Relevant people</h2>
            </div>
            {author ? (
              <article className="thread-person-card">
                <AvatarBadge avatarUrl={author.avatarUrl} displayName={author.displayName} size="small" />
                <div className="thread-person-copy">
                  <div>
                    <h3>{author.displayName}</h3>
                    <p className="handle">
                      <Link className="inline-link" href={`/u/${author.handle}`}>
                        @{author.handle}
                      </Link>
                    </p>
                  </div>
                  <span className="thread-person-role">Author</span>
                </div>
              </article>
            ) : (
              <p className="muted-copy">Author unavailable.</p>
            )}
          </section>

          <section className="rail-card thread-side-card">
            <div className="section-intro thread-rail-heading">
              <h2>Post activity</h2>
            </div>
            <div className="thread-stat-row">
              <span>
                <strong>{thread.focus.metrics.replyCount}</strong> Replies
              </span>
              <span>
                <strong>{thread.focus.metrics.repostCount}</strong> Reposts
              </span>
              <span>
                <strong>{thread.focus.metrics.likeCount}</strong> Likes
              </span>
            </div>
            <p className="thread-posted-at">{postedAt}</p>
          </section>

          {visibleParticipants.length > 1 ? (
            <section className="rail-card thread-side-card">
              <div className="section-intro thread-rail-heading">
                <h2>In this conversation</h2>
              </div>
              <div className="thread-participant-list">
                {visibleParticipants.map((participant) => (
                  <Link className="thread-participant-link" href={`/u/${participant.handle}`} key={participant.userId}>
                    <AvatarBadge avatarUrl={participant.avatarUrl} displayName={participant.displayName} size="small" />
                    <span>
                      <strong>{participant.displayName}</strong>
                      <span>@{participant.handle}</span>
                    </span>
                  </Link>
                ))}
              </div>
              {participants.length > visibleParticipants.length ? (
                <p className="thread-posted-at">+{participants.length - visibleParticipants.length} more</p>
              ) : null}
            </section>
          ) : null}
        </>
      }
    >
      {thread.ancestors.length > 0 ? (
        <section className="thread-context-chain" aria-label="Conversation context">
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

      <section className="thread-focus-stage" aria-label="Post">
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

      <section className="thread-replies-stage" aria-label="Replies">
        <div className="thread-replies-heading">
          <h2>Replies</h2>
        </div>
        <FeedList
          emptyBody="No replies yet. Reply to the post to start the conversation."
          emptyTitle="No replies yet"
          items={threadResult.items}
          targetPath={threadTargetPath}
          viewerHandle={viewer?.handle}
          viewerUserId={viewer?.userId}
        />
        {thread.nextReplyCursor ? (
          <div className="pagination-actions thread-pagination-actions">
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

function buildParticipantRows(thread: NonNullable<Awaited<ReturnType<typeof getPostThread>>>) {
  const participantMap = new Map<
    string,
    {
      userId: string;
      handle: string;
      displayName: string;
      avatarUrl: string;
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
  ) => {
    if (!actor || participantMap.has(actor.userId)) {
      return;
    }

    participantMap.set(actor.userId, actor);
  };

  upsert(thread.focus?.author);
  for (const reply of thread.replies) {
    upsert(reply.author);
  }

  return [...participantMap.values()];
}
