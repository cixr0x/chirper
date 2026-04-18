import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction } from "../actions";

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
  const filters = searchParams ? await searchParams : undefined;
  const requestState = getRequestState(filters?.status);
  const confirmState = getConfirmState(filters?.status);
  const previewToken = filters?.token ?? "";
  const previewHandle = filters?.handle ?? "";
  const expiresAt = filters?.expiresAt ? formatDateTime(filters.expiresAt) : null;

  return (
    <main className="auth-shell auth-shell-narrow">
      <section className="auth-hero-grid reset-layout">
        <article className="auth-hero-copy">
          <p className="eyebrow">Reset password</p>
          <h1>Recover access without leaving the product flow.</h1>
          <p className="lede">
            Identity owns token issuance and consumption. The web app only renders the request and
            confirm steps and stores the fresh session after a successful reset.
          </p>
          <Link className="inline-link" href="/">
            Back to login
          </Link>
        </article>

        <div className="auth-card-stack">
          <article className="auth-card">
            <div className="section-intro">
              <p className="eyebrow">Request token</p>
              <h2>Issue reset token</h2>
            </div>
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
              <button className="primary-button wide-button" type="submit">
                Request reset token
              </button>
            </form>
          </article>

          <article className="auth-card">
            <div className="section-intro">
              <p className="eyebrow">Set new password</p>
              <h2>Confirm reset</h2>
            </div>
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
              <button className="secondary-button wide-button" type="submit">
                Reset password and sign in
              </button>
            </form>
          </article>
        </div>
      </section>

      {previewToken ? (
        <section className="auth-preview-grid">
          <article className="panel auth-preview-panel">
            <div className="section-intro">
              <p className="eyebrow">Demo preview</p>
              <h2>Temporary token</h2>
            </div>
            <code className="token-preview">{previewToken}</code>
            <p className="muted-copy">
              In production this token would be delivered out of band. Here it is exposed so you can
              walk the full recovery flow.
            </p>
            {expiresAt ? <p className="muted-copy">Expires at {expiresAt}.</p> : null}
          </article>
        </section>
      ) : null}
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
