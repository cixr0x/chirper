import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <p className="eyebrow">404</p>
      <h1>That profile does not exist yet.</h1>
      <p className="lede">
        The requested handle is not currently available through the BFF directory.
      </p>
      <Link className="back-link" href="/">
        Back to directory
      </Link>
    </main>
  );
}
