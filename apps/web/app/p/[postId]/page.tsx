import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedList } from "../../../components/feed-list";
import { getPostThread } from "../../../lib/bff";
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
  const thread = await getPostThread(postId, session ? sessionToken ?? undefined : undefined);

  if (!thread?.focus) {
    notFound();
  }

  const threadPath = `/p/${thread.focus.postId}`;

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
      </section>
    </main>
  );
}
