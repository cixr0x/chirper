import Link from "next/link";
import { notFound } from "next/navigation";
import { followUserAction, saveProfileAction, signInAction, unfollowUserAction } from "../../actions";
import { getInitials, getUserByHandle, getViewerFollowingUserIds } from "../../../lib/bff";
import { getSessionState, getSessionToken } from "../../../lib/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
  searchParams?: Promise<{
    auth?: string;
    account?: string;
  }>;
};

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const [user, session, sessionToken] = await Promise.all([
    getUserByHandle(handle),
    getSessionState(),
    getSessionToken(),
  ]);
  const filters = searchParams ? await searchParams : undefined;

  if (!user) {
    notFound();
  }

  const viewer = session?.viewer ?? null;
  const hasAuthError = !viewer && (filters?.auth === "invalid" || filters?.auth === "invalid-login");
  const accountMessage = isViewerAccountMessage(filters?.account);
  const activeSessionToken = session ? sessionToken : null;
  const followingUserIds = activeSessionToken ? await getViewerFollowingUserIds(activeSessionToken) : [];
  const isViewer = viewer?.userId === user.userId;
  const isFollowing = viewer ? followingUserIds.includes(user.userId) : false;
  const homeHref = "/";

  return (
    <main className="profile-shell">
      <Link className="back-link" href={homeHref}>
        Back to timeline
      </Link>

      <section className="profile-hero">
        <div className="banner-panel" />
        <div className="profile-card">
          <div className="profile-avatar">{getInitials(user.displayName)}</div>
          <div className="profile-copy">
            <div className="identity-row">
              <h1>{user.displayName}</h1>
              <span className={`status-pill ${user.status}`}>{user.status}</span>
            </div>
            <p className="handle">@{user.handle}</p>
            <p className="bio large">{user.bio || "This profile is ready for its first post."}</p>
            <div className="profile-meta">
              <span>{user.location || "Location pending"}</span>
              <span>{user.links?.length ?? 0} public links</span>
              {viewer ? <span>Viewing as @{viewer.handle}</span> : null}
            </div>
            {!viewer ? (
              <form action={signInAction} className="profile-action-row">
                <input name="redirectTo" type="hidden" value={`/u/${user.handle}`} />
                <input name="handle" type="hidden" value={user.handle} />
                <label className="field inline-field">
                  <span>Password</span>
                  <input name="password" placeholder={`Password for @${user.handle}`} required type="password" />
                </label>
                <button className="primary-button compact" type="submit">
                  Continue as @{user.handle}
                </button>
                <Link className="inline-link" href="/reset">
                  Reset password
                </Link>
              </form>
            ) : viewer && !isViewer ? (
              <form action={isFollowing ? unfollowUserAction : followUserAction} className="profile-action-row">
                <input name="followeeUserId" type="hidden" value={user.userId} />
                <input name="targetProfileHandle" type="hidden" value={user.handle} />
                <button className={isFollowing ? "secondary-button compact" : "primary-button compact"} type="submit">
                  {isFollowing ? `Unfollow @${user.handle}` : `Follow @${user.handle}`}
                </button>
              </form>
            ) : (
              <>
                <p className="session-badge">This profile is the active signed-in account.</p>
                {accountMessage ? (
                  <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
                    {accountMessage.text}
                  </p>
                ) : null}
              </>
            )}
            {hasAuthError ? <p className="auth-error profile-error">Invalid handle or password.</p> : null}
          </div>
        </div>
      </section>

      <section className="profile-columns">
        <article className="profile-panel">
          <p className="eyebrow">Owned by `profile`</p>
          <h2>{isViewer ? "Edit profile details" : "Profile details"}</h2>
          {isViewer ? (
            <>
              <p>
                This form writes through the BFF into `profile_*` only. The signed-in identity and
                session remain unchanged.
              </p>

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
                    defaultValue={user.avatarUrl}
                    name="avatarUrl"
                    placeholder="https://example.com/avatar.png"
                    type="url"
                  />
                </label>

                <label className="field">
                  <span>Banner URL</span>
                  <input
                    defaultValue={user.bannerUrl}
                    name="bannerUrl"
                    placeholder="https://example.com/banner.jpg"
                    type="url"
                  />
                </label>

                <div className="profile-action-row">
                  <button className="primary-button compact" type="submit">
                    Save profile
                  </button>
                  <Link className="inline-link" href="/onboarding">
                    Open onboarding
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <p>
              This screen is composed through the BFF from `identity` and `profile` data without any
              shared-table shortcut.
            </p>
          )}
        </article>

        <article className="profile-panel">
          <p className="eyebrow">Follow graph</p>
          <h2>Viewer relationship</h2>
          {viewer ? (
            <p>
              {isViewer
                ? "This is the active session account. It always sees its own posts in the projected home timeline."
                : isFollowing
                  ? `@${viewer.handle} currently follows @${user.handle}.`
                  : `@${viewer.handle} does not follow @${user.handle} yet.`}
            </p>
          ) : (
            <p>Sign in with the profile&apos;s handle and password to follow accounts and rebuild the projected home timeline from this screen.</p>
          )}
        </article>

        <article className="profile-panel">
          <p className="eyebrow">Public links</p>
          <h2>Outbound references</h2>
          {(user.links?.length ?? 0) === 0 ? (
            <p>No public links configured yet.</p>
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
        </article>
      </section>
    </main>
  );
}

function isViewerAccountMessage(status?: string) {
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
