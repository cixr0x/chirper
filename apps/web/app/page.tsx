import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { AvatarBadge } from "../components/avatar-badge";
import { FeedList } from "../components/feed-list";
import { LiveNotificationEvents } from "../components/live-notification-events";
import { NotificationList } from "../components/notification-list";
import {
  createPostAction,
  markNotificationsReadAction,
  registerAction,
  signInAction,
} from "./actions";
import { getHomeFeed, getNotifications, getUserDirectory, getViewerFollowingUserIds } from "../lib/bff";
import { getSessionState, getSessionToken } from "../lib/session";

export const dynamic = "force-dynamic";

const demoCredentials = [
  { handle: "alana", password: "chirper-alana" },
  { handle: "omar", password: "chirper-omar" },
];

type HomePageProps = {
  searchParams?: Promise<{
    auth?: string;
    account?: string;
    feedTrail?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [session, sessionToken, filters] = await Promise.all([
    getSessionState(),
    getSessionToken(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const viewer = session?.viewer ?? null;
  const authMessage = !viewer ? getAuthMessage(filters?.auth) : null;
  const accountMessage = viewer ? getAccountMessage(filters?.account) : null;
  const authView = filters?.view === "signup" ? "signup" : "signin";
  const authRedirectPath = authView === "signup" ? "/?view=signup" : "/";

  if (!viewer || !sessionToken) {
    return (
      <main className="landing-shell">
        <section className="landing-grid">
          <article className="landing-brand-panel">
            <div className="landing-brand-lockup">
              <span className="landing-brand-mark">C</span>
              <span className="landing-brand-wordmark">Chirper</span>
            </div>
            <div className="landing-copy-stack">
              <h1>See what your network is talking about right now.</h1>
              <p className="landing-lede">
                A clean front door for a fast, social timeline. Sign in to post, follow, reply, and
                keep up with the conversation as it moves.
              </p>
            </div>
            <ul className="landing-principles">
              <li>One timeline at the center.</li>
              <li>Simple entry, no dashboard clutter.</li>
              <li>Posts, profiles, replies, and notifications in one flow.</li>
            </ul>
          </article>

          <section className="landing-auth-panel">
            <div className="landing-auth-header">
              <p className="eyebrow">{authView === "signup" ? "Create account" : "Sign in"}</p>
              <h2>{authView === "signup" ? "Join Chirper today" : "Welcome back"}</h2>
              <p className="landing-auth-copy">
                {authView === "signup"
                  ? "Create your account and land directly in the product flow."
                  : "Sign in to continue where the timeline left off."}
              </p>
            </div>

            <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
              <Link
                aria-selected={authView === "signin"}
                className={`auth-mode-link ${authView === "signin" ? "active" : ""}`}
                href="/"
              >
                Log in
              </Link>
              <Link
                aria-selected={authView === "signup"}
                className={`auth-mode-link ${authView === "signup" ? "active" : ""}`}
                href="/?view=signup"
              >
                Sign up
              </Link>
            </div>

            {authMessage ? (
              <p className={`notice ${authMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
                {authMessage.text}
              </p>
            ) : null}

            {authView === "signup" ? (
              <form action={registerAction} className="stack-form landing-auth-form">
                <input name="redirectTo" type="hidden" value={authRedirectPath} />
                <label className="field">
                  <span>Handle</span>
                  <input name="handle" placeholder="new_handle" required type="text" />
                </label>
                <label className="field">
                  <span>Display name</span>
                  <input name="displayName" placeholder="Dana Torres" required type="text" />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input name="password" placeholder="At least 8 characters" required type="password" />
                </label>
                <button className="primary-button wide-button landing-submit" type="submit">
                  Create account
                </button>
              </form>
            ) : (
              <form action={signInAction} className="stack-form landing-auth-form">
                <input name="redirectTo" type="hidden" value={authRedirectPath} />
                <label className="field">
                  <span>Handle</span>
                  <input name="handle" placeholder="alana" required type="text" />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input name="password" placeholder="chirper-alana" required type="password" />
                </label>
                <button className="primary-button wide-button landing-submit" type="submit">
                  Sign in
                </button>
              </form>
            )}

            <div className="landing-auth-footer">
              <p className="muted-copy">
                {authView === "signup" ? "Already have an account?" : "Need to reset your password?"}
              </p>
              <div className="landing-footer-links">
                {authView === "signup" ? (
                  <Link className="inline-link" href="/">
                    Log in instead
                  </Link>
                ) : (
                  <Link className="inline-link" href="/reset">
                    Open recovery flow
                  </Link>
                )}
              </div>
            </div>

            <div className="landing-demo-note">
              <p className="landing-demo-title">Demo access for this environment</p>
              <div className="landing-demo-list">
                {demoCredentials.map((credential) => (
                  <span className="landing-demo-chip" key={credential.handle}>
                    @{credential.handle} / {credential.password}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </section>

        <footer className="landing-footer">
          <span>Chirper</span>
          <span>Timeline-first social app</span>
          <Link className="inline-link" href="/reset">
            Reset password
          </Link>
        </footer>
      </main>
    );
  }

  const users = await getUserDirectory();
  const [homeFeed, followingUserIds, notifications] = await Promise.all([
    getHomeFeed(sessionToken, 10),
    getViewerFollowingUserIds(sessionToken),
    getNotifications(sessionToken, 4),
  ]);
  const suggestedUsers = users.filter((user) => user.userId !== viewer.userId).slice(0, 5);
  const followingSet = new Set(followingUserIds);
  const needsOnboarding =
    !viewer.bio &&
    !viewer.location &&
    !viewer.avatarAssetId &&
    !viewer.bannerAssetId &&
    !viewer.avatarUrl &&
    !viewer.bannerUrl;

  return (
    <AppShell
      active="home"
      description="Posts from the accounts you follow, your own activity, and quick access to what is happening around you."
      eyebrow="Timeline"
      notificationCount={notifications.unreadCount}
      showHeader={false}
      title="Home"
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card" id="notifications">
            <div className="section-intro">
            <p className="eyebrow">Notifications</p>
            <h2>{notifications.unreadCount} unread</h2>
          </div>
          <NotificationList
              emptyBody="Once people follow or interact with your posts, alerts will land here."
              emptyTitle="Nothing new yet"
              items={notifications.notifications}
            />
            <div className="rail-actions">
              <Link className="inline-link" href="/notifications">
                Open inbox
              </Link>
              <form action={markNotificationsReadAction}>
                <input name="targetPath" type="hidden" value="/" />
                <button className="secondary-button compact" type="submit">
                  Mark read
                </button>
              </form>
            </div>
          </section>

          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">People</p>
              <h2>Keep the feed moving</h2>
            </div>
            <div className="mini-profile-list">
              {suggestedUsers.length === 0 ? (
                <p className="muted-copy">More profiles will appear here as the environment grows.</p>
              ) : (
                suggestedUsers.map((user) => (
                  <article className="mini-profile-card" key={user.userId}>
                    <div>
                      <p className="mini-profile-name">{user.displayName}</p>
                      <p className="mini-profile-handle">@{user.handle}</p>
                    </div>
                    <div className="mini-profile-meta">
                      <span className={`follow-chip ${followingSet.has(user.userId) ? "following" : ""}`}>
                        {followingSet.has(user.userId) ? "Following" : "Explore"}
                      </span>
                      <Link className="inline-link" href={`/u/${user.handle}`}>
                        View
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rail-card">
            <LiveNotificationEvents />
          </section>
        </>
      }
    >
      {accountMessage ? (
        <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
          {accountMessage.text}
        </p>
      ) : null}

      {needsOnboarding ? (
        <section className="inline-banner">
          <div>
            <p className="eyebrow">Profile setup</p>
            <h2>Complete your public profile before you settle into the timeline.</h2>
          </div>
          <Link className="primary-link-button" href="/onboarding">
            Finish onboarding
          </Link>
        </section>
      ) : null}

      <section className="panel timeline-surface">
        <div className="timeline-composer-block">
          <form action={createPostAction} className="home-composer">
            <input name="targetProfileHandle" type="hidden" value={viewer.handle} />
            <div className="home-composer-main">
              <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="small" />
              <div className="home-composer-field">
                <textarea
                  className="home-composer-input"
                  maxLength={280}
                  name="body"
                  placeholder="What is happening?"
                  rows={4}
                />
                <div className="home-composer-footer">
                  <label className="home-composer-media" htmlFor="home-media-source">
                    <span>Optional image URL</span>
                    <input
                      id="home-media-source"
                      name="mediaSourceUrl"
                      placeholder="Paste one image URL"
                      type="url"
                    />
                  </label>
                  <button className="primary-button compact" type="submit">
                    Post
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="timeline-feed-block">
          <FeedList
            emptyBody="Follow a few people or publish the first post to start shaping this home feed."
            emptyTitle="Your timeline is empty"
            infinitePath="/api/feed"
            items={homeFeed.items}
            nextCursor={homeFeed.nextCursor}
            pageSize={10}
            targetPath="/"
            viewerHandle={viewer.handle}
            viewerUserId={viewer.userId}
          />
        </div>
      </section>
    </AppShell>
  );
}

function getAuthMessage(status?: string) {
  switch (status) {
    case "handle-taken":
      return { tone: "error" as const, text: "That handle is already taken." };
    case "invalid-login":
      return { tone: "error" as const, text: "Invalid handle or password." };
    case "invalid-register":
      return {
        tone: "error" as const,
        text: "Registration failed. Check the handle format, display name, and password length.",
      };
    default:
      return null;
  }
}

function getAccountMessage(status?: string) {
  switch (status) {
    case "registered":
      return { tone: "success" as const, text: "Account created and signed in." };
    case "password-changed":
      return { tone: "success" as const, text: "Password updated successfully." };
    case "password-error":
      return {
        tone: "error" as const,
        text: "Password update failed. Check the current password and password rules.",
      };
    case "password-reset":
      return { tone: "success" as const, text: "Password reset complete. A fresh session is active." };
    case "profile-saved":
      return { tone: "success" as const, text: "Profile details saved." };
    case "profile-error":
      return {
        tone: "error" as const,
        text: "Profile update failed. Check the field lengths and any asset URLs.",
      };
    default:
      return null;
  }
}
