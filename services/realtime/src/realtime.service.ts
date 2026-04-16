import { Injectable } from "@nestjs/common";

type BufferedEvent = {
  sequence: number;
  userId: string;
  notificationId: string;
  actorUserId: string;
  type: string;
  resourceId: string;
  createdAt: string;
};

@Injectable()
export class RealtimeService {
  private readonly eventStore = new Map<string, BufferedEvent[]>();
  private readonly sequenceStore = new Map<string, number>();

  publishNotification(input: {
    userId: string;
    notificationId: string;
    actorUserId: string;
    type: string;
    resourceId?: string;
    createdAt: string;
  }) {
    const nextSequence = (this.sequenceStore.get(input.userId) ?? 0) + 1;
    this.sequenceStore.set(input.userId, nextSequence);

    const event: BufferedEvent = {
      sequence: nextSequence,
      userId: input.userId,
      notificationId: input.notificationId,
      actorUserId: input.actorUserId,
      type: input.type,
      resourceId: input.resourceId ?? "",
      createdAt: input.createdAt,
    };

    const events = this.eventStore.get(input.userId) ?? [];
    events.unshift(event);
    this.eventStore.set(input.userId, events.slice(0, 50));

    return {
      sequence: nextSequence,
    };
  }

  listBufferedEvents(userId: string, afterSequence = 0, limit = 20) {
    const events = this.eventStore.get(userId) ?? [];
    const filtered = events
      .filter((event) => event.sequence > afterSequence)
      .sort((left, right) => left.sequence - right.sequence)
      .slice(0, Math.min(Math.max(limit, 1), 100));

    return {
      events: filtered,
      nextSequence: this.sequenceStore.get(userId) ?? 0,
    };
  }
}
