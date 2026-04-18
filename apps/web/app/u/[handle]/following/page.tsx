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
        <section className="rail-card">
          <div className="section-intro">
            <p className="eyebrow">Overview</p>
            <h2>{following.lastPage.totalCount} total</h2>
          </div>
          <p className="muted-copy">
            These cards are composed through the BFF on top of graph edges rather than by reading
            foreign tables directly.
          </p>
          <Link className="inline-link" href={`/u/${user.handle}`}>
            Back to @{user.handle}
          </Link>
        </section>
      }
    >
      <section className="panel timeline-panel">
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
