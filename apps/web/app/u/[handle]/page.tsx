import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AvatarBadge } from "../../../components/avatar-badge";
import { FeedList } from "../../../components/feed-list";
import { followUserAction, saveProfileAction, unfollowUserAction } from "../../actions";
import {
  getFollowers,
  getFollowing,
  getUserByHandle,
  getUserFeed,
  getViewerFollowingUserIds,
} from "../../../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../../../lib/pagination";
import { getSessionState, getSessionToken } from "../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
  searchParams?: Promise<{
    account?: string;
    feedTrail?: string;
  }>;
};

export default async function UserProfilePage({ params, searchParams }: PageProps) {
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
  const profilePath = `/u/${user.handle}`;
  const profileTargetPath = buildPathWithSearch(profilePath, filters);
  const feedTrail = parseCursorTrail(filters?.feedTrail);
  const [followingUserIds, userFeedResult, followers, following] = await Promise.all([
    activeSessionToken ? getViewerFollowingUserIds(activeSessionToken) : Promise.resolve([] as string[]),
    collectPaginatedPages({
      trail: feedTrail,
      loadPage: (cursor) => getUserFeed(user.userId, activeSessionToken ?? undefined, 8, cursor),
      getItems: (page) => page.items,
      getNextCursor: (page) => page.nextCursor,
    }),
    getFollowers(user.userId, activeSessionToken ?? undefined, 3),
    getFollowing(user.userId, activeSessionToken ?? undefined, 3),
  ]);
  const isViewer = viewer?.userId === user.userId;
  const isFollowing = viewer ? followingUserIds.includes(user.userId) : false;
  const accountMessage = getProfileMessage(filters?.account);
  const linkRows = buildEditableLinkRows(user.links);

  return (
    <AppShell
      active={isViewer ? "profile" : undefined}
      description={isViewer ? "Manage your profile and track your public activity." : `See what @${user.handle} is posting and how their graph is evolving.`}
      eyebrow="Profile"
      title={isViewer ? "Your profile" : `@${user.handle}`}
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Overview</p>
              <h2>{user.displayName}</h2>
            </div>
            <div className="rail-metric-strip">
              <Link className="rail-metric" href={`${profilePath}/followers`}>
                <span className="rail-metric-value">{followers.totalCount}</span>
                <span className="rail-metric-label">Followers</span>
              </Link>
              <Link className="rail-metric" href={`${profilePath}/following`}>
                <span className="rail-metric-value">{following.totalCount}</span>
                <span className="rail-metric-label">Following</span>
              </Link>
            </div>
            <p className="muted-copy">{user.bio || "This profile has not added a bio yet."}</p>
            <div className="profile-meta">
              <span>{user.location || "Location pending"}</span>
              <Link className="inline-link" href={`${profilePath}/followers`}>
                {followers.totalCount} followers
              </Link>
              <Link className="inline-link" href={`${profilePath}/following`}>
                {following.totalCount} following
              </Link>
            </div>
            <p className="profile-rail-note">
              {isViewer
                ? "You are looking at your public profile."
                : isFollowing
                  ? `You are following @${user.handle}.`
                  : `You are not following @${user.handle} yet.`}
            </p>
          </section>

          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Links</p>
              <h2>Public references</h2>
            </div>
            {(user.links?.length ?? 0) === 0 ? (
              <p className="muted-copy">No public links configured yet.</p>
            ) : (
              <ul className="link-list">
                {(user.links ?? []).map((link) => (
                  <li key={`${user.userId}-${link.label}`}>
                    <span>{link.label}</span>
                    <a href={link.url} rel="noreferrer" target="_blank">
                      {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      }
    >
      <section className="panel profile-hero-card">
        <div
          className={`banner-panel ${user.bannerUrl ? "banner-panel-image" : ""}`}
          style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : undefined}
        />
        <div className="profile-summary">
          <div className="profile-summary-head">
            <div className="profile-summary-copy">
              <AvatarBadge avatarUrl={user.avatarUrl} displayName={user.displayName} size="profile" />
              <div className="profile-summary-identity">
                <div className="identity-row">
                  <h2>{user.displayName}</h2>
                  <span className={`status-pill ${user.status}`}>{user.status}</span>
                </div>
                <p className="handle">@{user.handle}</p>
              </div>
            </div>

            <div className="profile-cta-row">
              {!viewer ? (
                <Link className="primary-link-button" href="/">
                  Sign in to interact
                </Link>
              ) : isViewer ? (
                <>
                  <Link className="secondary-button compact" href="/onboarding">
                    Edit onboarding
                  </Link>
                  <span className="follow-chip viewer">Your account</span>
                </>
              ) : (
                <form action={isFollowing ? unfollowUserAction : followUserAction}>
                  <input name="followeeUserId" type="hidden" value={user.userId} />
                  <input name="targetProfileHandle" type="hidden" value={user.handle} />
                  <input name="targetPath" type="hidden" value={profileTargetPath} />
                  <button className={isFollowing ? "secondary-button compact" : "primary-button compact"} type="submit">
                    {isFollowing ? `Unfollow @${user.handle}` : `Follow @${user.handle}`}
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="bio large">{user.bio || "This profile is ready for its next post."}</p>
          <div className="profile-stat-strip">
            <Link className="profile-stat" href={`${profilePath}/followers`}>
              <strong>{followers.totalCount}</strong>
              <span>Followers</span>
            </Link>
            <Link className="profile-stat" href={`${profilePath}/following`}>
              <strong>{following.totalCount}</strong>
              <span>Following</span>
            </Link>
            <div className="profile-stat">
              <strong>{user.location || "Pending"}</strong>
              <span>Location</span>
            </div>
          </div>
          <div className="profile-meta">
            <span>{user.location || "Location pending"}</span>
            <Link className="inline-link" href={`${profilePath}/followers`}>
              {followers.totalCount} followers
            </Link>
            <Link className="inline-link" href={`${profilePath}/following`}>
              {following.totalCount} following
            </Link>
            {viewer ? <span>Viewing as @{viewer.handle}</span> : null}
          </div>
        </div>
      </section>

      {accountMessage ? (
        <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
          {accountMessage.text}
        </p>
      ) : null}

      {isViewer ? (
        <section className="panel editor-panel">
          <div className="section-intro">
            <p className="eyebrow">Edit profile</p>
            <h2>Refine how this account appears across the app</h2>
          </div>

          <form action={saveProfileAction} className="stack-form">
            <input name="redirectTo" type="hidden" value={`/u/${user.handle}`} />
            <input name="successState" type="hidden" value="profile-saved" />

            <label className="field">
              <span>Bio</span>
              <textarea
                defaultValue={user.bio}
                maxLength={280}
                name="bio"
                placeholder="Tell people what this account is about."
                rows={4}
              />
            </label>

            <div className="inline-form-grid">
              <label className="field">
                <span>Location</span>
                <input
                  defaultValue={user.location}
                  maxLength={128}
                  name="location"
                  placeholder="Monterrey"
                  type="text"
                />
              </label>
              <label className="field">
                <span>Avatar URL</span>
                <input
                  name="avatarSourceUrl"
                  placeholder="https://images.example.com/avatar.png"
                  type="url"
                />
              </label>
              <label className="field">
                <span>Banner URL</span>
                <input
                  name="bannerSourceUrl"
                  placeholder="https://images.example.com/banner.jpg"
                  type="url"
                />
              </label>
            </div>

            <div className="toggle-row">
              <label className="inline-toggle">
                <input name="clearAvatar" type="checkbox" value="1" />
                <span>Clear current avatar</span>
              </label>
              <label className="inline-toggle">
                <input name="clearBanner" type="checkbox" value="1" />
                <span>Clear current banner</span>
              </label>
            </div>

            <div className="link-editor">
              <div className="section-intro">
                <p className="eyebrow">Profile links</p>
                <h2>Outbound references</h2>
              </div>
              {linkRows.map((link, index) => (
                <div className="link-row" key={`profile-link-${index}`}>
                  <label className="field">
                    <span>Label {index + 1}</span>
                    <input defaultValue={link.label} maxLength={32} name="linkLabel" placeholder="GitHub" type="text" />
                  </label>
                  <label className="field">
                    <span>URL {index + 1}</span>
                    <input defaultValue={link.url} name="linkUrl" placeholder="https://github.com/you" type="url" />
                  </label>
                </div>
              ))}
            </div>

            <div className="composer-actions">
              <button className="primary-button" type="submit">
                Save profile
              </button>
              <Link className="inline-link" href="/onboarding">
                Open onboarding
              </Link>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel timeline-panel">
        <div className="section-intro">
          <p className="eyebrow">Activity</p>
          <h2>{isViewer ? "Your posts, replies, and reposts" : `Recent activity from @${user.handle}`}</h2>
        </div>

        <FeedList
          emptyBody={
            isViewer
              ? "Publish a first post from Home to start building this activity stream."
              : `@${user.handle} has not published anything public yet.`
          }
          emptyTitle="No public activity yet"
          items={userFeedResult.items}
          targetPath={profileTargetPath}
          viewerHandle={viewer?.handle}
          viewerUserId={viewer?.userId}
        />
        {userFeedResult.nextCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail(profilePath, filters, "feedTrail", userFeedResult.nextCursor)}
            >
              Load more activity
            </Link>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function getProfileMessage(status?: string) {
  switch (status) {
    case "profile-saved":
      return { tone: "success" as const, text: "Profile updated successfully." };
    case "profile-error":
      return {
        tone: "error" as const,
        text: "Profile update failed. Check the field lengths and any asset URLs.",
      };
    default:
      return null;
  }
}

function buildEditableLinkRows(links: { label: string; url: string }[]) {
  const rows = [...links];
  while (rows.length < 3) {
    rows.push({ label: "", url: "" });
  }

  return rows.slice(0, 4);
}
