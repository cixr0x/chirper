"use client";

import { useEffect, useId, useState } from "react";
import { startConversationAction } from "../app/actions";
import type { UserSummary } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type MessageStartCardProps = {
  viewerUserId?: string;
};

export function MessageStartCard({ viewerUserId }: MessageStartCardProps) {
  const inputId = useId();
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
        const nextResults = await searchMessageUsers(trimmedQuery, 8);
        if (!isActive) {
          return;
        }

        setResults(
          nextResults.filter(
            (user) => user.allowDirectInbox !== false && (!viewerUserId || user.userId !== viewerUserId),
          ),
        );
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
  }, [trimmedQuery, viewerUserId]);

  return (
    <section className="empty-state message-start-card" aria-label="Start a direct conversation">
      <h3>Start a conversation</h3>
      <form className="user-search-form" onSubmit={(event) => event.preventDefault()} role="search">
        <label className="user-search-label" htmlFor={inputId}>
          Search people
        </label>
        <input
          autoComplete="off"
          className="user-search-input"
          id={inputId}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="@handle or display name"
          type="search"
          value={query}
        />
      </form>

      <div className="user-search-results" aria-live="polite">
        {status === "idle" ? <p className="muted-copy">Find someone to message.</p> : null}
        {status === "loading" ? <p className="muted-copy">Searching...</p> : null}
        {status === "error" ? <p className="muted-copy">Search is unavailable right now.</p> : null}
        {status === "ready" && results.length === 0 ? <p className="muted-copy">No matching people.</p> : null}
        {status === "ready" && results.length > 0
          ? results.map((user) => (
              <article className="user-search-result" key={user.userId}>
                <AvatarBadge avatarUrl={user.avatarUrl} displayName={user.displayName} size="small" />
                <div className="user-search-result-copy">
                  <p className="mini-profile-name">{user.displayName}</p>
                  <p className="mini-profile-handle">@{user.handle}</p>
                </div>
                <form action={startConversationAction}>
                  <input name="recipientUserId" type="hidden" value={user.userId} />
                  <button className="secondary-button compact" type="submit">
                    Message
                  </button>
                </form>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}

async function searchMessageUsers(query: string, limit: number) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));

  const response = await fetch(`/api/users/search?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("User search request failed");
  }

  return (await response.json()) as UserSummary[];
}
