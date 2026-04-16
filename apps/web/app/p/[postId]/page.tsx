import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarBadge } from "../../../components/avatar-badge";
import { FeedList } from "../../../components/feed-list";
import { formatPostTimestamp, getPostLikes, getPostReposts, getPostThread } from "../../../lib/bff";
import { getSessionState, getSessionToken } from "../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function ThreadPage({ params }: PageProps) {
  const { postId } = await params;
  const [session, sessionToken] = await Promise.all([getSessionState(), getSessionToken()]);
  const viewer = session?.viewer ?? null;
  const activeSessionToken = session ? sessionToken ?? undefined : undefined;
  const [thread, likes, reposts] = await Promise.all([
    getPostThread(postId, activeSessionToken),
    getPostLikes(postId, activeSessionToken),
    getPostReposts(postId, activeSessionToken),
  ]);

  if (!thread?.focus) {
    notFound();
  }

  const threadPath = `/p/${thread.focus.postId}`;
  const participants = buildParticipantRows(thread, likes, reposts);

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/">
        Back to timeline
      </Link>

      <section className="feed-section thread-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Thread</p>
            <h1>Conversation around this post</h1>
          </div>
          <p className="section-copy">
            Ancestors and direct replies are fetched from `posts` read APIs, while likes and repost
            metrics still come from the owned interaction tables behind the BFF.
          </p>
        </div>

        {thread.ancestors.length > 0 ? (
          <section className="thread-block">
            <p className="eyebrow">Context</p>
            <FeedList
              emptyBody=""
              emptyTitle=""
              items={thread.ancestors}
              targetPath={threadPath}
              viewerHandle={viewer?.handle}
            />
          </section>
        ) : null}

        <section className="thread-block">
          <p className="eyebrow">Focus post</p>
          <FeedList
            emptyBody=""
            emptyTitle=""
            items={[thread.focus]}
            targetPath={threadPath}
            viewerHandle={viewer?.handle}
          />
        </section>

        <section className="thread-block">
          <p className="eyebrow">Replies</p>
          <FeedList
            emptyBody="No direct replies yet. Use the reply form to start the conversation from this page."
            emptyTitle="No replies yet"
            items={thread.replies}
            targetPath={threadPath}
            viewerHandle={viewer?.handle}
          />
        </section>

        <section className="thread-block engagement-layout">
          <article className="profile-panel">
            <p className="eyebrow">Participants</p>
            <h2>{participants.length} people in this thread</h2>
            <p className="section-copy">
              Derived from the focus post, direct replies, and engagement actors already returned by
              owned read APIs.
            </p>

            {participants.length === 0 ? (
              <p>No public participants recorded yet.</p>
            ) : (
              <div className="engagement-stack">
                {participants.map((participant) => (
                  <article className="engagement-card" key={`participant-${participant.userId}`}>
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
          </article>

          <article className="profile-panel">
            <p className="eyebrow">Likes</p>
            <h2>{likes.length} accounts liked this post</h2>
            <EngagementList
              emptyMessage="No likes yet."
              items={likes}
            />
          </article>

          <article className="profile-panel">
            <p className="eyebrow">Reposts</p>
            <h2>{reposts.length} accounts reposted this post</h2>
            <EngagementList
              emptyMessage="No reposts yet."
              items={reposts}
            />
          </article>
        </section>
      </section>
    </main>
  );
}

function EngagementList({
  items,
  emptyMessage,
}: {
  items: Awaited<ReturnType<typeof getPostLikes>>;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p>{emptyMessage}</p>;
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
  likes: Awaited<ReturnType<typeof getPostLikes>>,
  reposts: Awaited<ReturnType<typeof getPostReposts>>,
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
    upsert(reply.author, "Reply participant");
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
