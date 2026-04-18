import Link from "next/link";
import { followUserAction, unfollowUserAction } from "../app/actions";
import { type RelationshipUser } from "../lib/bff";
import { AvatarBadge } from "./avatar-badge";

type RelationshipListProps = {
  items: RelationshipUser[];
  viewerUserId?: string | undefined;
  targetPath: string;
  emptyTitle: string;
  emptyBody: string;
};

export function RelationshipList({
  items,
  viewerUserId,
  targetPath,
  emptyTitle,
  emptyBody,
}: RelationshipListProps) {
  if (items.length === 0) {
    return (
      <article className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </article>
    );
  }

  return (
    <div className="relationship-list">
      {items.map((user) => (
        <article className="relationship-card" key={user.userId}>
          <div className="feed-main-row">
            <AvatarBadge avatarUrl={user.avatarUrl} displayName={user.displayName} size="small" />
            <div className="feed-main-copy">
              <div className="identity-row">
                <div>
                  <h3>{user.displayName}</h3>
                  <p className="handle">@{user.handle}</p>
                </div>
                <span className={`status-pill ${user.status}`}>{user.status}</span>
              </div>
              <p className="bio">{user.bio || "Profile is ready for the next update."}</p>
              <div className="feed-meta-row">
                <span>{user.location || "Location pending"}</span>
                <span>{user.links.length} links</span>
                <Link className="inline-link" href={`/u/${user.handle}`}>
                  Open profile
                </Link>
              </div>
              <div className="relationship-action-row">
                <span
                  className={`follow-chip ${user.isViewer ? "viewer" : user.isFollowedByViewer ? "following" : ""}`}
                >
                  {viewerUserId
                    ? user.isViewer
                      ? "Viewer"
                      : user.isFollowedByViewer
                        ? "Following"
                        : "Not followed"
                    : "Signed out"}
                </span>
                {viewerUserId && !user.isViewer ? (
                  <form action={user.isFollowedByViewer ? unfollowUserAction : followUserAction}>
                    <input name="followeeUserId" type="hidden" value={user.userId} />
                    <input name="targetProfileHandle" type="hidden" value={user.handle} />
                    <input name="targetPath" type="hidden" value={targetPath} />
                    <button
                      className={user.isFollowedByViewer ? "secondary-button compact" : "primary-button compact"}
                      type="submit"
                    >
                      {user.isFollowedByViewer ? `Unfollow @${user.handle}` : `Follow @${user.handle}`}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
