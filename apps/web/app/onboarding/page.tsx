import Link from "next/link";
import { redirect } from "next/navigation";
import { saveProfileAction, signOutAction } from "../actions";
import { AvatarBadge } from "../../components/avatar-badge";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams?: Promise<{
    account?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [filters, session] = await Promise.all([
    searchParams ? searchParams : Promise.resolve(undefined),
    getSessionState(),
  ]);

  if (!session) {
    redirect("/");
  }

  const viewer = session.viewer;
  const accountMessage = getOnboardingMessage(filters?.account);
  const isBlankProfile =
    !viewer.bio &&
    !viewer.location &&
    !viewer.avatarAssetId &&
    !viewer.bannerAssetId &&
    !viewer.avatarUrl &&
    !viewer.bannerUrl;
  const linkRows = buildEditableLinkRows(viewer.links);

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/">
        Back to timeline
      </Link>

      <section className="app-hero onboarding-hero">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Shape the first version of @{viewer.handle}.</h1>
          <p className="lede">
            This step writes only to `profile_*`. The identity record and session already exist; now
            you can give the account a bio, location, and asset defaults before landing in the main
            feed.
          </p>
          <div className="session-toolbar">
            <p className="session-badge">Signed in as @{viewer.handle}</p>
            <form action={signOutAction}>
              <input name="redirectTo" type="hidden" value="/" />
              <button className="secondary-button compact" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>

          <div className="hero-panel">
          <p className="panel-label">What this updates</p>
          <ul className="roadmap-list">
            <li>`profile_profiles.bio`</li>
            <li>`profile_profiles.location`</li>
            <li>`profile_profiles.avatar_asset_id`</li>
            <li>`profile_profiles.banner_asset_id`</li>
            <li>`profile_profile_links`</li>
          </ul>
        </div>
      </section>

      <section className="profile-columns">
        <article className="profile-panel">
          <p className="eyebrow">Profile editor</p>
          <h2>{isBlankProfile ? "Complete the basics" : "Refine the account profile"}</h2>
          <p>
            Leave media imports blank if you want to keep the generated badge treatment for now. You
            can come back and revise this from your own profile page later.
          </p>
          {accountMessage ? (
            <p className={`notice ${accountMessage.tone === "error" ? "notice-error" : "notice-success"}`}>
              {accountMessage.text}
            </p>
          ) : null}

          <form action={saveProfileAction} className="stack-form">
            <input name="redirectTo" type="hidden" value={`/u/${viewer.handle}`} />
            <input name="successState" type="hidden" value="profile-saved" />

            <label className="field">
              <span>Bio</span>
              <textarea
                defaultValue={viewer.bio}
                maxLength={280}
                name="bio"
                placeholder="What should people know first about this account?"
                rows={4}
              />
            </label>

            <label className="field">
              <span>Location</span>
              <input
                defaultValue={viewer.location}
                maxLength={128}
                name="location"
                placeholder="Monterrey"
                type="text"
              />
            </label>

            <div className="asset-grid">
              <label className="field">
                <span>New avatar source URL</span>
                <input
                  name="avatarSourceUrl"
                  placeholder="https://images.example.com/avatar.png"
                  type="url"
                />
              </label>

              <label className="field inline-toggle">
                <input name="clearAvatar" type="checkbox" value="1" />
                <span>Clear current avatar</span>
              </label>
            </div>

            <div className="asset-grid">
              <label className="field">
                <span>New banner source URL</span>
                <input
                  name="bannerSourceUrl"
                  placeholder="https://images.example.com/banner.jpg"
                  type="url"
                />
              </label>

              <label className="field inline-toggle">
                <input name="clearBanner" type="checkbox" value="1" />
                <span>Clear current banner</span>
              </label>
            </div>

            <div className="link-editor">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Public links</p>
                  <h3>Optional outbound references</h3>
                </div>
                <p className="section-copy">
                  Links stay in `profile_profile_links` and are replaced as a full set on save.
                </p>
              </div>
              {linkRows.map((link, index) => (
                <div className="link-row" key={`onboarding-link-${index}`}>
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

            <div className="profile-action-row">
              <button className="primary-button compact" type="submit">
                Save profile and open @{viewer.handle}
              </button>
              <Link className="inline-link" href={`/u/${viewer.handle}`}>
                Skip to profile
              </Link>
            </div>
          </form>
        </article>

        <article className="profile-panel">
          <p className="eyebrow">Preview</p>
          <h2>Current summary</h2>
          <p>
            The BFF will read this profile back immediately after save, so the directory card, your
            own profile page, and future feed attributions all stay consistent.
          </p>

          <div className="subcard preview-card">
            <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="profile" />
            <h3>{viewer.displayName}</h3>
            <p className="handle">@{viewer.handle}</p>
            <p className="bio">{viewer.bio || "No bio yet. Add one in the form to give the account a voice."}</p>
            <div className="card-footer">
              <span>{viewer.location || "Location pending"}</span>
              <span>
                {viewer.avatarAssetId
                  ? "Avatar managed by media"
                  : viewer.avatarUrl
                    ? "Legacy direct avatar URL"
                    : "Using default badge avatar"}
              </span>
              <span>{viewer.links.length} public links</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function buildEditableLinkRows(links: { label: string; url: string }[]) {
  const rows = [...links];
  while (rows.length < 3) {
    rows.push({ label: "", url: "" });
  }

  return rows.slice(0, 4);
}

function getOnboardingMessage(status?: string) {
  switch (status) {
    case "registered":
      return {
        tone: "success" as const,
        text: "Account created. Add the first profile details before you jump into the timeline.",
      };
    case "profile-error":
      return {
        tone: "error" as const,
        text: "Profile update failed. Check the field lengths and any asset URLs.",
      };
    default:
      return null;
  }
}
