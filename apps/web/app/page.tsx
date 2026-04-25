import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { FeedList } from "../components/feed-list";
import { HomeComposer } from "../components/home-composer";
import { LiveNotificationEvents } from "../components/live-notification-events";
import { NotificationList } from "../components/notification-list";
import { PasswordField } from "../components/password-field";
import { SignInForm } from "../components/sign-in-form";
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

const landingPreviewPosts = [
  {
    author: "Alana Pierce",
    handle: "@alana",
    body: "Shipping a calmer, easier timeline surface.",
    meta: "12 replies / 48 likes",
  },
  {
    author: "Omar Chavez",
    handle: "@omar",
    body: "The posting flow stays quick while the product gets sharper.",
    meta: "5 reposts / 19 likes",
  },
];

type HomePageProps = {
  searchParams?: Promise<{
    auth?: string;
    account?: string;
    feedTrail?: string;
    redirectTo?: string;
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
  const returnTo = getSafeRedirectPath(filters?.redirectTo);
  const authErrorId = authMessage?.tone === "error" ? "auth-form-error" : undefined;
  const authRedirectPath = authView === "signup" ? "/?view=signup" : returnTo;
  const signInHref = returnTo === "/" ? "/" : `/?redirectTo=${encodeURIComponent(returnTo)}`;
  const signUpHref = returnTo === "/" ? "/?view=signup" : `/?view=signup&redirectTo=${encodeURIComponent(returnTo)}`;

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
              <Link className="primary-link-button landing-mobile-auth-cta" href="#landing-auth">
                Go to login form
              </Link>
            </div>
            <ul className="landing-principles">
              <li>One timeline at the center.</li>
              <li>Simple entry, no dashboard clutter.</li>
              <li>Posts, profiles, replies, and notifications in one flow.</li>
            </ul>
            <div className="landing-preview-stack" aria-hidden="true">
              {landingPreviewPosts.map((post) => (
                <article className="landing-preview-card" key={post.handle}>
                  <div className="landing-preview-head">
                    <strong>{post.author}</strong>
                    <span>{post.handle}</span>
                  </div>
                  <p>{post.body}</p>
                  <span>{post.meta}</span>
                </article>
              ))}
            </div>
          </article>

          <section className="landing-auth-panel" id="landing-auth">
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
                aria-current={authView === "signin" ? "page" : undefined}
                aria-selected={authView === "signin"}
                className={`auth-mode-link ${authView === "signin" ? "active" : ""}`}
                href={signInHref}
                role="tab"
              >
                Log in
              </Link>
              <Link
                aria-current={authView === "signup" ? "page" : undefined}
                aria-selected={authView === "signup"}
                className={`auth-mode-link ${authView === "signup" ? "active" : ""}`}
                href={signUpHref}
                role="tab"
              >
                Sign up
              </Link>
            </div>

            {authMessage ? (
              <p
                id={authErrorId}
                className={`notice ${authMessage.tone === "error" ? "notice-error" : "notice-success"}`}
                role="alert"
              >
                {authMessage.text}
              </p>
            ) : null}

            {authView === "signup" ? (
              <form action={registerAction} className="stack-form landing-auth-form">
                <input name="redirectTo" type="hidden" value={authRedirectPath} />
                <div className="field">
                  <label htmlFor="register-handle">Handle</label>
                  <input
                    autoComplete="username"
                    id="register-handle"
                    name="handle"
                    placeholder="Choose a handle"
                    required
                    type="text"
                  />
                </div>
                <div className="field">
                  <label htmlFor="register-display-name">Display name</label>
                  <input id="register-display-name" name="displayName" placeholder="Display name" required type="text" />
                </div>
                <div className="field">
                  <label htmlFor="register-password">Password</label>
                  <PasswordField
                    autoComplete="new-password"
                    id="register-password"
                    name="password"
                    placeholder="At least 8 characters"
                    required
                  />
                </div>
                <button className="primary-button wide-button landing-submit" type="submit">
                  Create account
                </button>
              </form>
            ) : (
              <SignInForm
                action={signInAction}
                authErrorId={authErrorId}
                demoCredentials={demoCredentials}
                redirectTo={authRedirectPath}
              />
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

            <div className="landing-auth-support">
              <div>
                <p className="eyebrow">Fast start</p>
                <p className="section-copy">Create an account or use the seeded demo credentials below.</p>
              </div>
              <div>
                <p className="eyebrow">Recovery</p>
                <p className="section-copy">Password reset lives in the same product flow if you need it.</p>
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
          <section className="rail-card rail-card-accent">
            <div className="section-intro">
              <p className="eyebrow">For you</p>
              <h2>@{viewer.handle}</h2>
            </div>
            <p className="section-copy">
              Your home feed is pulling from the accounts you follow, your own posts, and the latest
              activity around your profile.
            </p>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{followingUserIds.length}</span>
                <span className="rail-metric-label">Following</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{notifications.unreadCount}</span>
                <span className="rail-metric-label">Unread</span>
              </div>
            </div>
          </section>

          <section className="rail-card" id="notifications">
            <div className="rail-heading-row">
              <div className="section-intro">
                <p className="eyebrow">Notifications</p>
                <h2>Inbox snapshot</h2>
              </div>
              <span className="follow-chip viewer">{notifications.unreadCount} unread</span>
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
              <h2>Suggested profiles</h2>
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
        <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`} role="alert">
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

      <section className="panel timeline-surface" id="composer">
        <div className="timeline-composer-block">
          <HomeComposer action={createPostAction} viewer={viewer} />
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

function getSafeRedirectPath(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
