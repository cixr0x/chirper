import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction, signOutAction } from "../actions";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

type ResetPageProps = {
  searchParams?: Promise<{
    status?: string;
    handle?: string;
    token?: string;
    expiresAt?: string;
  }>;
};

export default async function ResetPage({ searchParams }: ResetPageProps) {
  const [filters, session] = await Promise.all([searchParams ? searchParams : Promise.resolve(undefined), getSessionState()]);
  const viewer = session?.viewer ?? null;
  const requestState = getRequestState(filters?.status);
  const confirmState = getConfirmState(filters?.status);
  const previewToken = filters?.token ?? "";
  const previewHandle = filters?.handle ?? "";
  const expiresAt = filters?.expiresAt ? formatDateTime(filters.expiresAt) : null;

  return (
    <main className="profile-shell">
      <Link className="back-link" href="/">
        Back to timeline
      </Link>

      <section className="app-hero reset-hero">
        <div>
          <p className="eyebrow">Credential recovery</p>
          <h1>Password resets stay inside `identity`.</h1>
          <p className="lede">
            The request and confirm steps are separate on purpose: `identity` owns token issuance and
            consumption, while `web` only renders the flow and stores the fresh session returned after
            a successful reset.
          </p>
          {viewer ? (
            <div className="session-toolbar">
              <p className="session-badge">Signed in as @{viewer.handle}</p>
              <form action={signOutAction}>
                <input name="redirectTo" type="hidden" value="/reset" />
                <button className="secondary-button compact" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>

        <div className="hero-panel">
          <p className="panel-label">How this demo works</p>
          <ul className="roadmap-list">
            <li>Requesting a reset always returns a generic acceptance response.</li>
            <li>The preview token is shown only in this demo flow instead of being emailed.</li>
            <li>Submitting the reset token rotates sessions and signs you back in.</li>
          </ul>
        </div>
      </section>

      <section className="notes-strip reset-grid">
        <article className="profile-panel">
          <p className="eyebrow">Request reset</p>
          <h2>Issue reset token</h2>
          <p>
            If the handle exists and owns a password credential, `identity` creates a short-lived reset
            token and stores only its hash.
          </p>
          {requestState ? (
            <p className={`notice ${requestState.tone === "error" ? "notice-error" : "notice-success"}`}>
              {requestState.text}
            </p>
          ) : null}

          <form action={requestPasswordResetAction} className="stack-form">
            <label className="field">
              <span>Handle</span>
              <input defaultValue={previewHandle} name="handle" placeholder="alana" required type="text" />
            </label>
            <button className="primary-button" type="submit">
              Request reset token
            </button>
          </form>

          {previewToken ? (
            <article className="subcard reset-preview">
              <p className="eyebrow">Demo preview token</p>
              <h3>@{previewHandle || "account"}</h3>
              <code>{previewToken}</code>
              <p className="subcard-copy">
                In production this token would be delivered out-of-band. Here it is surfaced so you can
                inspect the full reset workflow.
              </p>
              {expiresAt ? <p className="subcard-copy">Expires at {expiresAt}.</p> : null}
            </article>
          ) : null}
        </article>

        <article className="profile-panel">
          <p className="eyebrow">Confirm reset</p>
          <h2>Set new password</h2>
          <p>
            Paste the reset token and choose a new password. A successful reset returns a fresh identity
            session and signs the app back in.
          </p>
          {confirmState ? (
            <p className={`notice ${confirmState.tone === "error" ? "notice-error" : "notice-success"}`}>
              {confirmState.text}
            </p>
          ) : null}

          <form action={resetPasswordAction} className="stack-form">
            <label className="field">
              <span>Reset token</span>
              <input defaultValue={previewToken} name="resetToken" placeholder="prt_..." required type="text" />
            </label>
            <label className="field">
              <span>New password</span>
              <input name="newPassword" placeholder="At least 8 characters" required type="password" />
            </label>
            <button className="secondary-button" type="submit">
              Reset password and sign in
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

function getRequestState(status?: string) {
  switch (status) {
    case "requested":
      return {
        tone: "success" as const,
        text: "If that account exists, the reset flow has been prepared.",
      };
    case "invalid-request":
      return {
        tone: "error" as const,
        text: "A valid handle is required to request a password reset.",
      };
    default:
      return null;
  }
}

function getConfirmState(status?: string) {
  switch (status) {
    case "invalid-token":
      return {
        tone: "error" as const,
        text: "The reset token is missing, expired, or already consumed.",
      };
    case "invalid-password":
      return {
        tone: "error" as const,
        text: "Password reset failed. Check the token and the new password rules.",
      };
    default:
      return null;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
