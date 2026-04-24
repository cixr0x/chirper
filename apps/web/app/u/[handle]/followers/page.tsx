import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/app-shell";
import { RelationshipList } from "../../../../components/relationship-list";
import { getFollowers, getUserByHandle } from "../../../../lib/bff";
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

export default async function FollowersPage({ params, searchParams }: PageProps) {
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
  const targetPath = `/u/${user.handle}/followers`;
  const pageTargetPath = buildPathWithSearch(targetPath, filters);
  const followerTrail = parseCursorTrail(filters?.trail);
  const followers = await collectPaginatedPages({
    trail: followerTrail,
    loadPage: (cursor) => getFollowers(user.userId, activeSessionToken ?? undefined, 12, cursor),
    getItems: (page) => page.items,
    getNextCursor: (page) => page.nextCursor,
  });

  return (
    <AppShell
      active={viewer?.userId === user.userId ? "profile" : undefined}
      description={`Browse everyone following @${user.handle} without leaving the main app layout.`}
      eyebrow="Followers"
      title={`People following @${user.handle}`}
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card rail-card-accent">
            <div className="section-intro">
              <p className="eyebrow">Overview</p>
              <h2>{followers.lastPage.totalCount} followers</h2>
            </div>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{followers.items.length}</span>
                <span className="rail-metric-label">Loaded</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{followers.lastPage.totalCount}</span>
                <span className="rail-metric-label">Total</span>
              </div>
            </div>
            <p className="section-copy">Read from the graph service and enriched with profile summaries through the BFF.</p>
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
          <p className="eyebrow">Followers</p>
          <h2>People following @{user.handle}</h2>
          <p className="thread-stage-copy">Open profiles or follow people back without leaving the relationship view.</p>
        </div>
        <RelationshipList
          emptyBody={`@${user.handle} does not have any followers yet.`}
          emptyTitle="No followers yet"
          items={followers.items}
          targetPath={pageTargetPath}
          viewerUserId={viewer?.userId}
        />
        {followers.nextCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail(targetPath, filters, "trail", followers.nextCursor)}
            >
              Load more followers
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
