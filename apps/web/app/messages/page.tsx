import Link from "next/link";
import { sendMessageAction } from "../actions";
import { AppShell } from "../../components/app-shell";
import { AvatarBadge } from "../../components/avatar-badge";
import { MessageStartCard } from "../../components/message-start-card";
import { SignedOutGate } from "../../components/signed-out-gate";
import { getMessageConversation, getMessageConversations, type MessageConversation } from "../../lib/bff";
import { getSessionState, getSessionToken } from "../../lib/session";

export const dynamic = "force-dynamic";

type MessagesPageProps = {
  searchParams?: Promise<{
    conversation?: string;
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
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

  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return (
      <SignedOutGate
        active="messages"
        copy="Sign in to view chat, open private conversations, and return directly to your inbox."
        returnTo="/messages"
        title="Sign in to view chat"
      />
    );
  }

  const params = await searchParams;
  const requestedConversationId = params?.conversation?.trim() ?? "";
  const conversationEnvelope = await getMessageConversations(sessionToken, 20);
  const conversations = conversationEnvelope.conversations;
  const selectedConversation =
    conversations.find((conversation) => conversation.conversationId === requestedConversationId) ?? conversations[0];
  const thread = selectedConversation
    ? await getMessageConversation(sessionToken, selectedConversation.conversationId, 30)
    : null;
  const activeConversation = thread?.conversation ?? selectedConversation;
  const threadMessages = thread?.messages ?? [];

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
            {conversations.length > 0 ? (
              conversations.map((conversation) => (
                <ConversationRow
                  active={conversation.conversationId === activeConversation?.conversationId}
                  conversation={conversation}
                  key={conversation.conversationId}
                />
              ))
            ) : (
              <p className="muted-copy message-list-empty">No conversations yet.</p>
            )}
          </div>
        </aside>

        {activeConversation ? (
          <section className="panel message-thread-panel" aria-label={`Thread with ${activeConversation.otherUser.displayName}`}>
            <div className="message-thread-head">
              <div className="feed-head">
                <AvatarBadge
                  avatarUrl={activeConversation.otherUser.avatarUrl}
                  displayName={activeConversation.otherUser.displayName}
                  size="small"
                />
                <div>
                  <p className="eyebrow">Thread</p>
                  <h2>{activeConversation.otherUser.displayName}</h2>
                  <p className="handle">@{activeConversation.otherUser.handle}</p>
                </div>
              </div>
              {activeConversation.unreadCount > 0 ? (
                <span className="conversation-unread">{activeConversation.unreadCount}</span>
              ) : null}
            </div>

            <div className="message-thread" role="log" aria-label="Messages">
              {threadMessages.length > 0 ? (
                threadMessages.map((message) => {
                  const mine = message.authorUserId === session.viewer.userId;
                  const authorName = message.author?.displayName ?? (mine ? session.viewer.displayName : activeConversation.otherUser.displayName);

                  return (
                    <article className={`message-bubble ${mine ? "mine" : ""}`} key={message.messageId}>
                      <p className="message-bubble-meta">
                        <span>{authorName}</span>
                        <span>{formatMessageTimestamp(message.createdAt)}</span>
                      </p>
                      <p>{message.body}</p>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">
                  <h3>No messages yet</h3>
                  <p className="muted-copy">Send the first message in this conversation.</p>
                </div>
              )}
            </div>

            <form action={sendMessageAction} className="message-composer">
              <input name="conversationId" type="hidden" value={activeConversation.conversationId} />
              <input
                name="targetPath"
                type="hidden"
                value={`/messages?conversation=${encodeURIComponent(activeConversation.conversationId)}`}
              />
              <label className="field message-composer-field">
                <span>Message</span>
                <textarea name="body" placeholder={`Message @${activeConversation.otherUser.handle}`} rows={3} />
              </label>
              <div className="message-composer-actions">
                <span className="section-copy">Private message</span>
                <button className="primary-button compact" type="submit">
                  Send
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="panel message-thread-panel" aria-label="Start a conversation">
            <MessageStartCard viewerUserId={session.viewer.userId} />
          </section>
        )}
      </section>
    </AppShell>
  );
}

function ConversationRow({
  active,
  conversation,
}: {
  active: boolean;
  conversation: MessageConversation;
}) {
  const otherUser = conversation.otherUser;
  const timestamp = formatMessageTimestamp(conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt);

  return (
    <Link
      aria-current={active ? "true" : undefined}
      className={`conversation-card ${active ? "active" : ""}`}
      href={`/messages?conversation=${encodeURIComponent(conversation.conversationId)}`}
    >
      <div className="conversation-row">
        <AvatarBadge avatarUrl={otherUser.avatarUrl} displayName={otherUser.displayName} size="small" />
        <div className="conversation-copy">
          <div className="conversation-meta">
            <h3>{otherUser.displayName}</h3>
            <span className="feed-timestamp">{timestamp}</span>
          </div>
          <p className="handle">@{otherUser.handle}</p>
          <p>{conversation.lastMessagePreview || "No messages yet."}</p>
        </div>
        {conversation.unreadCount > 0 ? <span className="conversation-unread">{conversation.unreadCount}</span> : null}
      </div>
    </Link>
  );
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "New";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
