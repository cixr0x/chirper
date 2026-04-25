import Link from "next/link";
import { AppShell } from "./app-shell";
import type { PrimaryNavKey } from "./primary-nav";

type SignedOutGateProps = {
  active: PrimaryNavKey;
  copy: string;
  eyebrow?: string;
  returnTo: string;
  title: string;
};

export function SignedOutGate({ active, copy, eyebrow = "Sign in required", returnTo, title }: SignedOutGateProps) {
  const href = `/?redirectTo=${encodeURIComponent(returnTo)}`;

  return (
    <AppShell active={active} description={copy} eyebrow={eyebrow} title={title} viewer={null}>
      <section className="panel signed-out-gate">
        <div className="section-intro">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <p className="section-copy">{copy}</p>
        <div className="gate-actions">
          <Link className="primary-link-button" href={href}>
            Sign in
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
