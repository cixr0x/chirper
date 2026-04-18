import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSessionState();

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
          <p className="eyebrow">Inbox</p>
          <h2>Direct conversations</h2>
          <div className="conversation-list">
            {[
              {
                name: "Product design",
                summary: "The chat module is next in line after the main timeline pass.",
              },
              {
                name: "Infra notes",
                summary: "Kafka and Kubernetes work are already in place behind the UI.",
              },
            ].map((conversation) => (
              <article className="conversation-card" key={conversation.name}>
                <h3>{conversation.name}</h3>
                <p>{conversation.summary}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel message-placeholder">
          <p className="eyebrow">Compose</p>
          <h2>Chat is not wired yet</h2>
          <p>
            This route is here so the main navigation feels complete while the core social surfaces
            settle. The next product pass can turn it into a real conversation space.
          </p>
        </article>
      </section>
    </AppShell>
  );
}
