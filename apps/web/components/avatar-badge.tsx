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
  const [imageLoaded, setImageLoaded] = useState(false);
  const className =
    size === "profile"
      ? "profile-avatar"
      : size === "small"
        ? "avatar-badge small"
        : "avatar-badge";
  const initials = getInitials(displayName);

  if (avatarUrl && !imageFailed) {
    return (
      <span aria-label={`${displayName} avatar`} className={className}>
        <span aria-hidden="true" className="avatar-fallback-initials">
          {initials}
        </span>
        <img
          alt=""
          aria-hidden="true"
          className="avatar-image avatar-image-layer"
          draggable={false}
          onError={() => setImageFailed(true)}
          onLoad={() => setImageLoaded(true)}
          src={avatarUrl}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      </span>
    );
  }

  return (
    <div aria-label={`${displayName} avatar`} className={className}>
      {initials}
    </div>
  );
}
