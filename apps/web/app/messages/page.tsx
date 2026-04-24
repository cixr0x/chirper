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
      summary: "The chat module is next in line after the main timeline pass.",
      time: "Now",
      active: true,
    },
    {
      name: "Infra notes",
      handle: "ops",
      summary: "Kafka and Kubernetes work are already in place behind the UI.",
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
      description="A placeholder for the next major product surface."
      title="Messages"
      viewer={session.viewer}
    >
      <section className="message-layout">
        <article className="panel conversation-list-panel">
          <div className="message-list-head">
            <div className="section-intro">
              <p className="eyebrow">Inbox</p>
              <h2>Direct conversations</h2>
            </div>
            <span className="follow-chip viewer">Soon</span>
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
            <h2>Messaging is the next product surface</h2>
          </div>
          <div className="message-placeholder-copy">
            <p>
              This route is holding the place for real threads, delivery state, and a focused
              conversation view. The shell is here so the app already behaves like a complete
              product.
            </p>
            <div className="message-placeholder-list">
              <p>1. Conversation list on the left.</p>
              <p>2. Focused thread on the right.</p>
              <p>3. Composer anchored to the bottom of the thread.</p>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
