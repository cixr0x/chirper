import Link from "next/link";
import { notFound } from "next/navigation";
import { RelationshipList } from "../../../../components/relationship-list";
import { getFollowers, getUserByHandle } from "../../../../lib/bff";
import { getSessionState, getSessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
};

export default async function FollowersPage({ params }: PageProps) {
  const { handle } = await params;
  const [user, session, sessionToken] = await Promise.all([
    getUserByHandle(handle),
    getSessionState(),
    getSessionToken(),
  ]);

  if (!user) {
    notFound();
  }

  const viewer = session?.viewer ?? null;
  const activeSessionToken = session ? sessionToken : null;
  const followers = await getFollowers(user.userId, activeSessionToken ?? undefined);
  const targetPath = `/u/${user.handle}/followers`;

  return (
    <main className="profile-shell">
      <div className="relationship-nav">
        <Link className="back-link" href={`/u/${user.handle}`}>
          Back to @{user.handle}
        </Link>
        <Link className="inline-link" href="/">
          Back to timeline
        </Link>
      </div>

      <section className="feed-section relationship-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Followers</p>
            <h1>People following @{user.handle}</h1>
          </div>
          <p className="section-copy">
            This list is read from `graph` and enriched through the BFF with `identity` and `profile`
            summaries. The current viewer state is layered on without any cross-service table access.
          </p>
        </div>

        <div className="relationship-summary-row">
          <span className="count-chip">{followers.length} total</span>
          {viewer ? (
            <span className="follow-chip viewer">Viewing as @{viewer.handle}</span>
          ) : (
            <span className="follow-chip">Signed out</span>
          )}
        </div>

        {!viewer ? (
          <p className="relationship-note">
            Sign in to follow or unfollow accounts directly from this list.
          </p>
        ) : null}

        <RelationshipList
          emptyBody={`@${user.handle} does not have any followers yet.`}
          emptyTitle="No followers yet"
          items={followers}
          targetPath={targetPath}
          viewerUserId={viewer?.userId}
        />
      </section>
    </main>
  );
}
