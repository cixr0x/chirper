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
    <AppShell active={active} showHeader={false} title={title} viewer={null} wideCenter>
      <section className="panel signed-out-gate">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
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
