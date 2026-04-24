import Link from "next/link";

export default function NotFound() {
  return (
    <main className="auth-shell auth-shell-narrow">
      <section className="panel not-found-panel">
        <p className="eyebrow">404</p>
        <h1>That page is not available.</h1>
        <p className="lede">The link may be stale, private, or no longer available.</p>
        <Link className="primary-link-button" href="/">
          Back to home
        </Link>
      </section>
    </main>
  );
}
