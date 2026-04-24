import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { AvatarBadge } from "../../components/avatar-badge";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSessionState();
  const conversations = [
    {
      name: "Product design",
      handle: "design",
      summary: "Shared a compact layout direction for direct conversations.",
      time: "Now",
      active: true,
    },
    {
      name: "Alana Pierce",
      handle: "alana",
      summary: "Last message preview will appear here once conversations are active.",
      time: "2h",
      active: false,
    },
  ];

  if (!session) {
    redirect("/");
  }

  return (
    <AppShell
      active="messages"
      description="Private conversations in a focused inbox."
      title="Messages"
      viewer={session.viewer}
      wideCenter
    >
      <section className="message-layout">
        <article className="panel conversation-list-panel">
          <div className="message-list-head">
            <div className="section-intro">
              <p className="eyebrow">Inbox</p>
              <h2>Direct conversations</h2>
            </div>
            <span className="follow-chip viewer">Preview</span>
          </div>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <article className={`conversation-card ${conversation.active ? "active" : ""}`} key={conversation.name}>
                <div className="conversation-row">
                  <AvatarBadge avatarUrl="" displayName={conversation.name} size="small" />
                  <div className="conversation-copy">
                    <div className="conversation-meta">
                      <h3>{conversation.name}</h3>
                      <span className="feed-timestamp">{conversation.time}</span>
                    </div>
                    <p className="handle">@{conversation.handle}</p>
                    <p>{conversation.summary}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel message-placeholder">
          <div className="section-intro">
            <p className="eyebrow">Compose</p>
            <h2>Select a conversation</h2>
          </div>
          <div className="message-placeholder-copy">
            <p>Choose an inbox item to open a private thread. New conversations will start from this panel.</p>
            <div className="message-placeholder-list">
              <p>Recent conversations stay pinned to the left.</p>
              <p>Messages, reactions, and delivery status appear in the thread.</p>
              <p>The composer stays anchored near the bottom of the conversation.</p>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
