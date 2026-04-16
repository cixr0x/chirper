"use client";

import { useEffect, useRef, useState } from "react";
import type { NotificationItem, RealtimeEventEnvelope } from "../lib/bff";

export function LiveNotificationEvents() {
  const [events, setEvents] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState("Waiting for live updates...");
  const cursorRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const response = await fetch(
          `/api/realtime/events?afterSequence=${cursorRef.current}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (active) {
            setStatus("Live updates unavailable.");
          }
          return;
        }

        const payload = (await response.json()) as RealtimeEventEnvelope;
        cursorRef.current = payload.nextSequence;

        if (payload.events.length > 0 && active) {
          setEvents((current) => [...payload.events.slice().reverse(), ...current].slice(0, 6));
          setStatus("Receiving live notification fan-out.");
          return;
        }

        if (active && payload.nextSequence === 0) {
          setStatus("No live updates yet.");
        }
      } catch {
        if (active) {
          setStatus("Live updates unavailable.");
        }
      }
    }

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2500);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="live-events">
      <p className="eyebrow">Realtime</p>
      <h3>Live fan-out buffer</h3>
      <p className="section-copy">{status}</p>
      {events.length === 0 ? null : (
        <div className="live-event-stack">
          {events.map((event) => (
            <article className="live-event-card" key={`${event.notificationId}-${event.createdAt}`}>
              <p>{event.summary}</p>
              <span>{event.actor ? `@${event.actor.handle}` : "system"}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
