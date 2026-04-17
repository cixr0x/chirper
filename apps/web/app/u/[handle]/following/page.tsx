import Link from "next/link";
import { notFound } from "next/navigation";
import { RelationshipList } from "../../../../components/relationship-list";
import { getFollowing, getUserByHandle } from "../../../../lib/bff";
import { getSessionState, getSessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
};

export default async function FollowingPage({ params }: PageProps) {
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
  const following = await getFollowing(user.userId, activeSessionToken ?? undefined);
  const targetPath = `/u/${user.handle}/following`;

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
            <p className="eyebrow">Following</p>
            <h1>People @{user.handle} follows</h1>
          </div>
          <p className="section-copy">
            This surface reads the follow graph through `graph`, then composes identity and profile
            details through the BFF into relationship-aware cards for the current viewer.
          </p>
        </div>

        <div className="relationship-summary-row">
          <span className="count-chip">{following.length} total</span>
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
          emptyBody={`@${user.handle} is not following anyone yet.`}
          emptyTitle="No followed accounts yet"
          items={following}
          targetPath={targetPath}
          viewerUserId={viewer?.userId}
        />
      </section>
    </main>
  );
}
