import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { RelationshipList } from "../../../../components/relationship-list";
import { getFollowing, getUserByHandle } from "../../../../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../../../../lib/pagination";
import { getSessionState, getSessionToken } from "../../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
  searchParams?: Promise<{
    trail?: string;
  }>;
};

export default async function FollowingPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const [user, session, sessionToken, filters] = await Promise.all([
    getUserByHandle(handle),
    getSessionState(),
    getSessionToken(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  if (!user) {
    notFound();
  }

  const viewer = session?.viewer ?? null;
  const activeSessionToken = session ? sessionToken : null;
  const targetPath = `/u/${user.handle}/following`;
  const pageTargetPath = buildPathWithSearch(targetPath, filters);
  const followingTrail = parseCursorTrail(filters?.trail);
  const following = await collectPaginatedPages({
    trail: followingTrail,
    loadPage: (cursor) => getFollowing(user.userId, activeSessionToken ?? undefined, 12, cursor),
    getItems: (page) => page.items,
    getNextCursor: (page) => page.nextCursor,
  });

  return (
    <AppShell
      active={viewer?.userId === user.userId ? "profile" : undefined}
      description={`Browse the accounts @${user.handle} follows in the same layout as the rest of the app.`}
      eyebrow="Following"
      title={`People @${user.handle} follows`}
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card rail-card-accent">
            <div className="section-intro">
              <p className="eyebrow">Overview</p>
              <h2>{following.lastPage.totalCount} following</h2>
            </div>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{following.items.length}</span>
                <span className="rail-metric-label">Loaded</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{following.lastPage.totalCount}</span>
                <span className="rail-metric-label">Total</span>
              </div>
            </div>
            <p className="section-copy">Browse the accounts this profile follows and jump into any public profile.</p>
          </section>
          <section className="rail-card">
            <Link className="inline-link" href={`/u/${user.handle}`}>
              Back to @{user.handle}
            </Link>
          </section>
        </>
      }
    >
      <section className="panel timeline-panel">
        <div className="section-intro thread-stage-head">
          <p className="eyebrow">Following</p>
          <h2>People @{user.handle} follows</h2>
          <p className="thread-stage-copy">Use this surface to browse the network and jump back into profile detail.</p>
        </div>
        <RelationshipList
          emptyBody={`@${user.handle} is not following anyone yet.`}
          emptyTitle="No followed accounts yet"
          items={following.items}
          targetPath={pageTargetPath}
          viewerUserId={viewer?.userId}
        />
        {following.nextCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail(targetPath, filters, "trail", following.nextCursor)}
            >
              Load more following
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
