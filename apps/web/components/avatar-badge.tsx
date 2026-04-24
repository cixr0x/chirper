"use client";

import { useState } from "react";
import { getInitials } from "../lib/bff";

type AvatarBadgeProps = {
  avatarUrl?: string | undefined;
  displayName: string;
  size?: "default" | "small" | "profile";
};

export function AvatarBadge({ avatarUrl, displayName, size = "default" }: AvatarBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const className =
    size === "profile"
      ? "profile-avatar"
      : size === "small"
        ? "avatar-badge small"
        : "avatar-badge";

  if (avatarUrl && !imageFailed) {
    return (
      <img
        alt={`${displayName} avatar`}
        className={`${className} avatar-image`}
        onError={() => setImageFailed(true)}
        src={avatarUrl}
      />
    );
  }

  return (
    <div aria-label={`${displayName} avatar`} className={className}>
      {getInitials(displayName)}
    </div>
  );
}
