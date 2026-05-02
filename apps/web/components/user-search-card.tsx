"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { searchUsers, type UserSummary } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

export function UserSearchCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }

    let isActive = true;
    setStatus("loading");

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextResults = await searchUsers(trimmedQuery, 5);
        if (!isActive) {
          return;
        }

        setResults(nextResults);
        setStatus("ready");
      } catch {
        if (!isActive) {
          return;
        }

        setResults([]);
        setStatus("error");
      }
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  return (
    <section className="rail-card user-search-card" aria-label="User search">
      <form className="user-search-form" onSubmit={(event) => event.preventDefault()} role="search">
        <label className="user-search-label" htmlFor="timeline-user-search">
          Search users
        </label>
        <input
          autoComplete="off"
          className="user-search-input"
          id="timeline-user-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="@handle or display name"
          type="search"
          value={query}
        />
      </form>

      <div className="user-search-results" aria-live="polite">
        {status === "idle" ? <p className="muted-copy">Find profiles by handle or display name.</p> : null}
        {status === "loading" ? <p className="muted-copy">Searching...</p> : null}
        {status === "error" ? <p className="muted-copy">Search is unavailable right now.</p> : null}
        {status === "ready" && results.length === 0 ? <p className="muted-copy">No matching users.</p> : null}
        {status === "ready" && results.length > 0
          ? results.map((user) => (
              <article className="user-search-result" key={user.userId}>
                <AvatarBadge avatarUrl={user.avatarUrl} displayName={user.displayName} size="small" />
                <div className="user-search-result-copy">
                  <p className="mini-profile-name">{user.displayName}</p>
                  <p className="mini-profile-handle">@{user.handle}</p>
                </div>
                <Link className="inline-link" href={`/u/${user.handle}`}>
                  View
                </Link>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}
