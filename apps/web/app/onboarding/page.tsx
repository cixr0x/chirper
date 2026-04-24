import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { AvatarBadge } from "../../components/avatar-badge";
import { saveProfileAction } from "../actions";
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
  const completionItems = [
    Boolean(viewer.bio),
    Boolean(viewer.location),
    Boolean(viewer.avatarAssetId || viewer.avatarUrl),
    Boolean(viewer.bannerAssetId || viewer.bannerUrl),
    viewer.links.length > 0,
  ];
  const completedCount = completionItems.filter(Boolean).length;

  return (
    <AppShell
      active="profile"
      description="Finish the first version of this account before settling into the main feed."
      eyebrow="Onboarding"
      title="Profile setup"
      viewer={viewer}
      rightRail={
        <>
          <section className="rail-card rail-card-accent">
            <div className="section-intro">
              <p className="eyebrow">Progress</p>
              <h2>{completedCount}/5 complete</h2>
            </div>
            <div className="rail-metric-strip">
              <div className="rail-metric">
                <span className="rail-metric-value">{completedCount}</span>
                <span className="rail-metric-label">Completed</span>
              </div>
              <div className="rail-metric">
                <span className="rail-metric-value">{5 - completedCount}</span>
                <span className="rail-metric-label">Remaining</span>
              </div>
            </div>
            <p className="section-copy">Fill the basics so the account looks deliberate the first time someone opens it.</p>
          </section>

          <section className="rail-card">
            <div className="section-intro">
              <p className="eyebrow">Preview</p>
              <h2>{viewer.displayName}</h2>
            </div>
            <div className="preview-stack">
              <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="profile" />
              <p className="handle">@{viewer.handle}</p>
              <p className="muted-copy">{viewer.bio || "No bio yet. Add one in the form to give the account a voice."}</p>
            </div>
          </section>
        </>
      }
    >
      <section className="panel editor-panel">
        <div className="section-intro">
          <p className="eyebrow">Welcome</p>
          <h2>{isBlankProfile ? "Complete the basics" : "Refine your public profile"}</h2>
        </div>
        <p className="muted-copy">
          Add the details people see first: a short bio, location, image references, and any public links
          that help the profile feel complete.
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

          <div className="inline-form-grid">
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
              <p className="eyebrow">Public links</p>
              <h2>Optional outbound references</h2>
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

          <div className="composer-actions">
            <button className="primary-button" type="submit">
              Save profile
            </button>
            <Link className="inline-link" href={`/u/${viewer.handle}`}>
              Skip to profile
            </Link>
          </div>
        </form>
      </section>
    </AppShell>
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
