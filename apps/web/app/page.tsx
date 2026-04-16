import { LiveNotificationEvents } from "../components/live-notification-events";
import Link from "next/link";
import {
  changePasswordAction,
  createPostAction,
  markNotificationsReadAction,
  registerAction,
  requestPasswordResetAction,
  signInAction,
  signOutAction,
} from "./actions";
import {
  formatPostTimestamp,
  getHomeFeed,
  getInitials,
  getNotifications,
  getPublicFeed,
  getUserDirectory,
  getViewerFollowingUserIds,
} from "../lib/bff";
import { getSessionState, getSessionToken } from "../lib/session";

export const dynamic = "force-dynamic";

const currentScope = [
  "DB-backed identity and profile services",
  "Graph service plus projected home timeline",
  "Notifications service and buffered realtime fan-out",
];

const demoCredentials = [
  { handle: "alana", password: "chirper-alana" },
  { handle: "omar", password: "chirper-omar" },
];

type HomePageProps = {
  searchParams?: Promise<{
    auth?: string;
    account?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [users, session, sessionToken] = await Promise.all([
    getUserDirectory(),
    getSessionState(),
    getSessionToken(),
  ]);
  const filters = searchParams ? await searchParams : undefined;
  const viewer = session?.viewer ?? null;
  const authMessage = !viewer ? getAuthMessage(filters?.auth) : null;
  const accountMessage = viewer ? getAccountMessage(filters?.account) : null;
  const activeSessionToken = session ? sessionToken : null;
  const [feed, followingUserIds, notifications] = activeSessionToken
    ? await Promise.all([
        getHomeFeed(activeSessionToken),
        getViewerFollowingUserIds(activeSessionToken),
        getNotifications(activeSessionToken),
      ])
    : await Promise.all([
        getPublicFeed(),
        Promise.resolve([] as string[]),
        Promise.resolve({ unreadCount: 0, notifications: [] }),
      ]);
  const followingSet = new Set(followingUserIds);
  const needsOnboarding = viewer
    ? !viewer.bio && !viewer.location && !viewer.avatarUrl && !viewer.bannerUrl
    : false;

  return (
    <main className="app-shell">
      <section className="app-hero">
        <div>
          <p className="eyebrow">Chirper Alpha</p>
          <h1>The app now has an inbox and live notification fan-out.</h1>
          <p className="lede">
            `notifications` owns durable inbox state, `realtime` owns ephemeral live delivery, and
            the web app reads both through the BFF while the follow graph and home timeline remain
            isolated behind gRPC boundaries.
          </p>
        </div>
        <div className="hero-panel">
          <p className="panel-label">Delivered now</p>
          <ul className="roadmap-list">
            {currentScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="timeline-layout">
        <div className="timeline-column">
          <section className="compose-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Session</p>
                <h2>{viewer ? `Home timeline for @${viewer.handle}` : "Sign in to Chirper Alpha"}</h2>
              </div>
              <p className="section-copy">
                An opaque identity-issued session cookie now defines the active viewer, and `web`
                forwards the session token to `bff` for protected reads and mutations.
              </p>
            </div>

            <>
              <div className="session-toolbar">
                <form action={signInAction} className="viewer-switcher">
                  <input name="redirectTo" type="hidden" value="/" />
                  <div className="auth-fields">
                    <label className="field">
                      <span>{viewer ? "Switch account" : "Handle"}</span>
                      <input
                        defaultValue={viewer?.handle ?? ""}
                        name="handle"
                        placeholder="alana"
                        required
                        type="text"
                      />
                    </label>

                    <label className="field">
                      <span>Password</span>
                      <input name="password" placeholder="chirper-alana" required type="password" />
                    </label>
                  </div>

                  <div className="session-actions">
                    <button className="secondary-button compact" type="submit">
                      {viewer ? "Switch account" : "Sign in"}
                    </button>
                    {!viewer ? (
                      <Link className="inline-link" href="/reset">
                        Forgot password?
                      </Link>
                    ) : null}
                  </div>
                </form>

                {viewer ? (
                  <form action={signOutAction}>
                    <input name="redirectTo" type="hidden" value="/" />
                    <button className="secondary-button compact" type="submit">
                      Sign out
                    </button>
                  </form>
                ) : null}
              </div>

              {viewer ? (
                <>
                  <p className="session-badge">Signed in as @{viewer.handle}</p>
                  {accountMessage ? (
                    <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
                      {accountMessage.text}
                    </p>
                  ) : null}
                  {needsOnboarding ? (
                    <article className="subcard onboarding-callout">
                      <p className="eyebrow">Next step</p>
                      <h3>Finish the public profile</h3>
                      <p className="subcard-copy">
                        This account is live but still blank. Add a bio, location, and optional asset
                        URLs before other users start discovering it in the directory.
                      </p>
                      <Link className="inline-link" href="/onboarding">
                        Open onboarding
                      </Link>
                    </article>
                  ) : null}
                  <form action={createPostAction} className="compose-form">
                    <input name="targetProfileHandle" type="hidden" value={viewer.handle} />

                    <label className="field">
                      <span>Post as @{viewer.handle}</span>
                      <textarea
                        maxLength={280}
                        name="body"
                        placeholder="Share something with the people who follow you."
                        required
                        rows={4}
                      />
                    </label>

                    <button className="primary-button" type="submit">
                      Publish
                    </button>
                  </form>

                  <article className="subcard security-card">
                    <div className="section-heading compact">
                      <div>
                        <p className="eyebrow">Security</p>
                        <h3>Change password</h3>
                      </div>
                      <p className="section-copy">
                        Password changes stay inside `identity`; the current session remains active.
                      </p>
                    </div>

                    <form action={changePasswordAction} className="stack-form">
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
                  </article>
                </>
              ) : (
                <>
                  <article className="empty-card compact-card">
                    <h3>Use a password-backed login to continue</h3>
                    <p>
                      The public feed still renders when signed out, but posting, following, and
                      notification reads now require an active session.
                    </p>
                    {authMessage ? (
                      <p className={`notice ${authMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
                        {authMessage.text}
                      </p>
                    ) : null}
                    {users.length > 0 ? (
                      <div className="demo-credential-list">
                        {demoCredentials.map((credential) => (
                          <article className="demo-credential-card" key={credential.handle}>
                            <h4>@{credential.handle}</h4>
                            <p>
                              Password: <code>{credential.password}</code>
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="subcard-copy">
                        This database has no seeded demo accounts yet. Use the registration form to
                        create the first one.
                      </p>
                    )}
                  </article>

                  <div className="auth-grid">
                    <article className="subcard">
                      <p className="eyebrow">Registration</p>
                      <h3>Create account</h3>
                      <p className="subcard-copy">
                        Signup creates `ident_users`, `ident_credentials`, a session, and a blank
                        `profile` record through the BFF.
                      </p>
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
                        <button className="primary-button" type="submit">
                          Create account
                        </button>
                      </form>
                    </article>

                    <article className="subcard">
                      <p className="eyebrow">Recovery</p>
                      <h3>Need a reset link?</h3>
                      <p className="subcard-copy">
                        Request a password reset token. In a production system this would be emailed;
                        in this demo it is shown in a dedicated reset workspace.
                      </p>
                      <form action={requestPasswordResetAction} className="stack-form">
                        <label className="field">
                          <span>Handle</span>
                          <input name="handle" placeholder="alana" required type="text" />
                        </label>
                        <button className="secondary-button" type="submit">
                          Open reset flow
                        </button>
                      </form>
                      <Link className="inline-link" href="/reset">
                        Go to reset workspace
                      </Link>
                    </article>
                  </div>
                </>
              )}
            </>
          </section>

          <section className="feed-section">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Timeline</p>
                <h2>{viewer ? `Projected feed for @${viewer.handle}` : "Public feed"}</h2>
              </div>
              <p className="section-copy">
                New posts fan out into `timeline_*` rows for signed-in viewers, while signed-out
                visitors fall back to the public post list.
              </p>
            </div>

            {feed.length === 0 ? (
              <article className="empty-card">
                <h3>No posts in this home timeline yet</h3>
                <p>
                  Create a post as the selected viewer or follow another account from its profile to
                  backfill their recent posts.
                </p>
              </article>
            ) : (
              <div className="feed-stack">
                {feed.map((item) => (
                  <article className="feed-card" key={item.postId}>
                    <div className="feed-head">
                      <div className="avatar-badge small">
                        {getInitials(item.author?.displayName ?? "U")}
                      </div>
                      <div>
                        <h3>{item.author?.displayName ?? "Unknown author"}</h3>
                        <p className="handle">
                          @{item.author?.handle ?? "unknown"} | {formatPostTimestamp(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="feed-body">{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="directory-section">
          {viewer ? (
            <section className="notifications-card">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Inbox</p>
                  <h2>
                    Notifications for @{viewer.handle}
                    <span className="count-chip">{notifications.unreadCount} unread</span>
                  </h2>
                </div>
                <p className="section-copy">
                  Follows and followed-account posts create durable `notify_*` records and also hit
                  the live delivery buffer.
                </p>
              </div>

              {notifications.notifications.length === 0 ? (
                <article className="empty-card compact-card">
                  <h3>No notifications yet</h3>
                  <p>Follow activity and new posts from followed users will appear here.</p>
                </article>
              ) : (
                <div className="notification-stack">
                  {notifications.notifications.map((notification) => (
                    <article className="notification-card" key={notification.notificationId}>
                      <div className="feed-head">
                        <div className="avatar-badge small">
                          {getInitials(notification.actor?.displayName ?? "U")}
                        </div>
                        <div>
                          <h3>{notification.actor?.displayName ?? "Unknown actor"}</h3>
                          <p className="handle">
                            @{notification.actor?.handle ?? "unknown"} | {formatPostTimestamp(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="notification-copy">{notification.summary}</p>
                    </article>
                  ))}
                </div>
              )}

              <div className="notification-actions">
                <form action={markNotificationsReadAction}>
                  <input name="targetPath" type="hidden" value="/" />
                  <button className="secondary-button compact" type="submit">
                    Mark all as read
                  </button>
                </form>
              </div>

              <LiveNotificationEvents />
            </section>
          ) : null}

          <div className="section-heading">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Use profiles to inspect and change the follow graph</h2>
            </div>
            <p className="section-copy">
              Demo follows are stored in `graph_*`; timeline rows rebuild into `timeline_*`; follow
              and post events also populate the notification pipeline.
            </p>
          </div>

          {users.length === 0 ? (
            <article className="empty-card">
              <h3>No profiles available yet</h3>
              <p>Create the first account from the registration panel to bootstrap the directory.</p>
            </article>
          ) : (
            <div className="directory-grid">
              {users.map((user) => {
                const isViewer = viewer?.userId === user.userId;
                const isFollowing = followingSet.has(user.userId);
                const profileHref = `/u/${user.handle}`;

                return (
                  <article className="user-card" key={user.userId}>
                    <div className="avatar-badge">{getInitials(user.displayName)}</div>
                    <div className="user-meta">
                      <div className="identity-row">
                        <h3>{user.displayName}</h3>
                        <span className={`status-pill ${user.status}`}>{user.status}</span>
                      </div>
                      <p className="handle">@{user.handle}</p>
                      <p className="bio">{user.bio || "Profile is ready for the next update."}</p>
                      <div className="card-footer">
                        <span>{user.location || "Location pending"}</span>
                        <span>{user.links?.length ?? 0} links</span>
                      </div>
                      <div className="user-card-actions">
                        <Link className="inline-link" href={profileHref}>
                          Open profile
                        </Link>
                        <span
                          className={`follow-chip ${isViewer ? "viewer" : isFollowing ? "following" : ""}`}
                        >
                          {viewer
                            ? isViewer
                              ? "Viewer"
                              : isFollowing
                                ? "Following"
                                : "Not followed"
                            : "Signed out"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="notes-strip">
        <article>
          <h3>Service boundary</h3>
          <p>`web` stores the opaque session token cookie, `bff` validates it through `identity`, and the rest of the system still coordinates `graph`, `timeline`, `notifications`, and `realtime` over gRPC.</p>
        </article>
        <article>
          <h3>Database rule</h3>
          <p>`identity` now owns `ident_sessions` and `ident_credentials`; `notifications` owns `notify_*`; `realtime` keeps ephemeral state only; no service reads another service&apos;s tables.</p>
        </article>
      </section>
    </main>
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
