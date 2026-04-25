"use client";

import { useState } from "react";
import type { UserSummary } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type HomeComposerProps = {
  action: (formData: FormData) => void | Promise<void>;
  viewer: Pick<UserSummary, "avatarUrl" | "displayName" | "handle">;
};

const postLimit = 280;

export function HomeComposer({ action, viewer }: HomeComposerProps) {
  const [body, setBody] = useState("");

  return (
    <form action={action} className="home-composer">
      <input name="targetProfileHandle" type="hidden" value={viewer.handle} />
      <div className="home-composer-intro">
        <div>
          <p className="eyebrow">Post</p>
          <h2>Share something with your timeline</h2>
        </div>
        <span className="composer-limit composer-counter">{body.length}/{postLimit}</span>
      </div>
      <div className="home-composer-main">
        <AvatarBadge avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="small" />
        <div className="home-composer-field">
          <textarea
            aria-label="What is happening?"
            className="home-composer-input"
            maxLength={postLimit}
            name="body"
            onChange={(event) => setBody(event.target.value)}
            placeholder="What is happening?"
            rows={3}
            value={body}
          />
          <div className="home-composer-footer">
            <p className="section-copy">This goes straight into your public timeline.</p>
            <button className="primary-button compact" type="submit">
              Post
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
