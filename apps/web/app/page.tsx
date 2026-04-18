import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { FeedList } from "../components/feed-list";
import { LiveNotificationEvents } from "../components/live-notification-events";
import { NotificationList } from "../components/notification-list";
import {
  changePasswordAction,
  createPostAction,
  markNotificationsReadAction,
  registerAction,
  requestPasswordResetAction,
  signInAction,
} from "./actions";
import { getHomeFeed, getNotifications, getPublicFeed, getUserDirectory, getViewerFollowingUserIds } from "../lib/bff";
import { appendCursorTrail, buildPathWithSearch, collectPaginatedPages, parseCursorTrail } from "../lib/pagination";
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
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [users, session, sessionToken, filters] = await Promise.all([
    getUserDirectory(),
    getSessionState(),
    getSessionToken(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const viewer = session?.viewer ?? null;
  const authMessage = !viewer ? getAuthMessage(filters?.auth) : null;
  const accountMessage = viewer ? getAccountMessage(filters?.account) : null;
  const feedTrail = parseCursorTrail(filters?.feedTrail);
  const homePath = buildPathWithSearch("/", filters);

  if (!viewer || !sessionToken) {
    const publicPreview = await getPublicFeed(4);

    return (
      <main className="auth-shell">
        <section className="auth-hero-grid">
          <article className="auth-hero-copy">
            <p className="eyebrow">Chirper</p>
            <h1>Join the conversation without the scaffolding feel.</h1>
            <p className="lede">
              A cleaner front door for the app: simple access, a familiar timeline flow, and a layout
              that keeps the conversation at the center.
            </p>

            <div className="credential-row">
              {demoCredentials.map((credential) => (
                <article className="credential-chip" key={credential.handle}>
                  <strong>@{credential.handle}</strong>
                  <span>{credential.password}</span>
                </article>
              ))}
            </div>

            <div className="auth-feature-list">
              <article className="feature-card">
                <h2>Follow the main social loop</h2>
                <p>Post, reply, like, repost, follow, and move through thread and profile views.</p>
              </article>
              <article className="feature-card">
                <h2>Backed by real service boundaries</h2>
                <p>Profiles, posts, follows, notifications, and media already power the full app loop.</p>
              </article>
            </div>
          </article>

          <div className="auth-card-stack">
            {authMessage ? (
              <p className={`notice ${authMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
                {authMessage.text}
              </p>
            ) : null}

            <article className="auth-card">
              <div className="section-intro">
                <p className="eyebrow">Sign in</p>
                <h2>Welcome back</h2>
              </div>
              <form action={signInAction} className="stack-form">
                <input name="redirectTo" type="hidden" value="/" />
                <label className="field">
                  <span>Handle</span>
                  <input name="handle" placeholder="alana" required type="text" />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input name="password" placeholder="chirper-alana" required type="password" />
                </label>
                <button className="primary-button wide-button" type="submit">
                  Sign in
                </button>
              </form>
              <Link className="inline-link" href="/reset">
                Forgot your password?
              </Link>
            </article>

            <article className="auth-card">
              <div className="section-intro">
                <p className="eyebrow">Create account</p>
                <h2>Get started</h2>
              </div>
              <form action={registerAction} className="stack-form">
                <input name="redirectTo" type="hidden" value="/" />
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
                <button className="secondary-button wide-button" type="submit">
                  Create account
                </button>
              </form>
            </article>

            <article className="auth-card auth-card-soft">
              <div className="section-intro">
                <p className="eyebrow">Reset access</p>
                <h2>Need a recovery token?</h2>
              </div>
              <form action={requestPasswordResetAction} className="stack-form">
                <label className="field">
                  <span>Handle</span>
                  <input name="handle" placeholder="alana" required type="text" />
                </label>
                <button className="secondary-button wide-button" type="submit">
                  Open reset flow
                </button>
              </form>
            </article>
          </div>
        </section>

        <section className="auth-preview-grid">
          <article className="panel auth-preview-panel">
            <div className="section-intro">
              <p className="eyebrow">Timeline preview</p>
              <h2>Public posts</h2>
            </div>
            <FeedList
              emptyBody="Create the first account to start the public conversation."
              emptyTitle="No public posts yet"
              items={publicPreview.items}
              targetPath="/"
            />
          </article>

          <article className="panel auth-preview-panel">
            <div className="section-intro">
              <p className="eyebrow">What you get</p>
              <h2>Once you sign in</h2>
            </div>
            <ul className="auth-bullet-list">
              <li>A left navigation rail with Home, Chat, Profile, and Notifications.</li>
              <li>A centered timeline with a compose form pinned to the top of the flow.</li>
              <li>Profile, thread, and notification surfaces aligned to the same app shell.</li>
            </ul>
            {users.length > 0 ? (
              <p className="muted-copy">{users.length} seeded users are available in the current environment.</p>
            ) : null}
          </article>
        </section>
      </main>
    );
  }

  const [feedResult, followingUserIds, notifications] = await Promise.all([
    collectPaginatedPages({
      trail: feedTrail,
      loadPage: (cursor) => getHomeFeed(sessionToken, 8, cursor),
      getItems: (page) => page.items,
      getNextCursor: (page) => page.nextCursor,
    }),
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

      <section className="panel composer-panel">
        <div className="section-intro">
          <p className="eyebrow">Compose</p>
          <h2>Post something</h2>
        </div>
        <form action={createPostAction} className="composer-form">
          <input name="targetProfileHandle" type="hidden" value={viewer.handle} />
          <label className="field">
            <span>Post body</span>
            <textarea
              maxLength={280}
              name="body"
              placeholder={`What is happening, @${viewer.handle}?`}
              rows={4}
            />
          </label>
          <div className="compact-media-grid">
            {[1, 2].map((slot) => (
              <label className="field" key={`media-slot-${slot}`}>
                <span>Image URL {slot}</span>
                <input
                  name="mediaSourceUrl"
                  placeholder={`https://images.example.com/post-${slot}.jpg`}
                  type="url"
                />
              </label>
            ))}
          </div>
          <div className="composer-actions">
            <button className="primary-button" type="submit">
              Post
            </button>
            <Link className="inline-link" href={`/u/${viewer.handle}`}>
              Open profile
            </Link>
          </div>
        </form>
      </section>

      <section className="panel timeline-panel">
        <div className="section-intro">
          <p className="eyebrow">For you</p>
          <h2>Scrollable home timeline</h2>
        </div>
        <FeedList
          emptyBody="Follow a few people or publish the first post to start shaping this home feed."
          emptyTitle="Your timeline is empty"
          items={feedResult.items}
          targetPath={homePath}
          viewerHandle={viewer.handle}
          viewerUserId={viewer.userId}
        />
        {feedResult.nextCursor ? (
          <div className="pagination-actions">
            <Link
              className="inline-link"
              href={appendCursorTrail("/", filters, "feedTrail", feedResult.nextCursor)}
            >
              Load more posts
            </Link>
          </div>
        ) : null}
      </section>

      <section className="panel security-panel">
        <div className="section-intro">
          <p className="eyebrow">Account</p>
          <h2>Update your password</h2>
        </div>
        <form action={changePasswordAction} className="inline-form-grid">
          <input name="redirectTo" type="hidden" value="/" />
          <label className="field">
            <span>Current password</span>
            <input name="currentPassword" required type="password" />
          </label>
          <label className="field">
            <span>New password</span>
            <input name="nextPassword" required type="password" />
          </label>
          <button className="secondary-button" type="submit">
            Update password
          </button>
        </form>
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
