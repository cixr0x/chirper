import { AppShell } from "../../components/app-shell";
import { AvatarBadge } from "../../components/avatar-badge";
import { SignedOutGate } from "../../components/signed-out-gate";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSessionState();

  if (!session) {
    return (
      <SignedOutGate
        active="messages"
        copy="Sign in to view chat, open private conversations, and return directly to your inbox."
        returnTo="/messages"
        title="Sign in to view chat"
      />
    );
  }

  const conversations = [
    {
      name: "Product design",
      handle: "design",
      summary: "Shared a compact layout direction for direct conversations.",
      time: "Now",
      active: true,
      unread: 2,
    },
    {
      name: "Alana Pierce",
      handle: "alana",
      summary: "Last message preview will appear here once conversations are active.",
      time: "2h",
      active: false,
      unread: 0,
    },
  ];
  const selectedConversation = conversations.find((conversation) => conversation.active) ?? conversations[0]!;
  const threadMessages = [
    {
      id: "thread-1",
      author: selectedConversation.name,
      body: "The inbox needs to stay separate from the public timeline, with the thread taking over the main column.",
      time: "9:31 AM",
      mine: false,
    },
    {
      id: "thread-2",
      author: session.viewer.displayName,
      body: "Agreed. I am keeping the composer in the message surface and leaving timeline posting on Home.",
      time: "9:34 AM",
      mine: true,
    },
    {
      id: "thread-3",
      author: selectedConversation.name,
      body: "That gives people a clear place to read and reply without crossing public and private actions.",
      time: "9:38 AM",
      mine: false,
    },
  ];

  return (
    <AppShell
      active="messages"
      description="Private conversations in a focused inbox."
      title="Messages"
      viewer={session.viewer}
      wideCenter
    >
      <section className="message-layout">
        <aside className="panel conversation-list-panel" aria-label="Conversations">
          <div className="message-list-head">
            <div className="section-intro">
              <p className="eyebrow">Inbox</p>
              <h2>Direct conversations</h2>
            </div>
            <span className="follow-chip viewer">{conversations.length}</span>
          </div>
          <div className="conversation-list">
            {conversations.map((conversation) => (
              <button
                aria-current={conversation.active ? "true" : undefined}
                className={`conversation-card ${conversation.active ? "active" : ""}`}
                key={conversation.name}
                type="button"
              >
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
                  {conversation.unread > 0 ? <span className="conversation-unread">{conversation.unread}</span> : null}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel message-thread-panel" aria-label={`Thread with ${selectedConversation.name}`}>
          <div className="message-thread-head">
            <div className="feed-head">
              <AvatarBadge avatarUrl="" displayName={selectedConversation.name} size="small" />
              <div>
                <p className="eyebrow">Thread</p>
                <h2>{selectedConversation.name}</h2>
                <p className="handle">@{selectedConversation.handle}</p>
              </div>
            </div>
            <span className="follow-chip viewer">Online</span>
          </div>

          <div className="message-thread" role="log" aria-label="Messages">
            {threadMessages.map((message) => (
              <article className={`message-bubble ${message.mine ? "mine" : ""}`} key={message.id}>
                <p className="message-bubble-meta">
                  <span>{message.author}</span>
                  <span>{message.time}</span>
                </p>
                <p>{message.body}</p>
              </article>
            ))}
          </div>

          <form className="message-composer">
            <label className="field message-composer-field">
              <span>Message</span>
              <textarea name="message" placeholder={`Message @${selectedConversation.handle}`} rows={3} />
            </label>
            <div className="message-composer-actions">
              <p className="section-copy">Private reply preview.</p>
              <button className="primary-button compact" type="button">
                Send
              </button>
            </div>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
