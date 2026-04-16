import { getInitials } from "../lib/bff";

type AvatarBadgeProps = {
  avatarUrl?: string | undefined;
  displayName: string;
  size?: "default" | "small" | "profile";
};

export function AvatarBadge({ avatarUrl, displayName, size = "default" }: AvatarBadgeProps) {
  const className =
    size === "profile"
      ? "profile-avatar"
      : size === "small"
        ? "avatar-badge small"
        : "avatar-badge";

  if (avatarUrl) {
    return <img alt={`${displayName} avatar`} className={`${className} avatar-image`} src={avatarUrl} />;
  }

  return <div className={className}>{getInitials(displayName)}</div>;
}
