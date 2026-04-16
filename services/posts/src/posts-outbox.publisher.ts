import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  DOMAIN_EVENTS,
  KAFKA_TOPICS,
  type DomainEventEnvelope,
  type PostLikeCreatedPayload,
  type PostLikeRemovedPayload,
  type PostPublishedPayload,
  type PostRepostCreatedPayload,
  type PostRepostRemovedPayload,
} from "@chirper/contracts-events";
import { Kafka, logLevel } from "kafkajs";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PostsOutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostsOutboxPublisherService.name);
  private readonly kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? "chirper-posts",
    brokers: kafkaBrokers(),
    logLevel: logLevel.NOTHING,
  });
  private readonly admin = this.kafka.admin();
  private readonly producer = this.kafka.producer();
  private running = false;
  private connected = false;
  private loopPromise?: Promise<void>;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.running = true;
    this.loopPromise = this.runPublisherLoop();
  }

  async onModuleDestroy() {
    this.running = false;
    await this.disconnect();
    await this.loopPromise?.catch(() => undefined);
  }

  private async runPublisherLoop() {
    while (this.running) {
      try {
        await this.ensureConnected();
        await this.publishNextBatch();
      } catch (error) {
        this.connected = false;
        this.logger.warn(`Kafka publish loop paused: ${messageFromError(error)}`);
        await this.disconnect();
      }

      await sleep(this.publishIntervalMs());
    }
  }

  private async ensureConnected() {
    if (this.connected) {
      return;
    }

    await this.admin.connect();
    await this.admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: this.postsTopic(),
          numPartitions: 3,
          replicationFactor: 1,
        },
      ],
    });
    await this.producer.connect();
    this.connected = true;
    this.logger.log(`Kafka producer ready for ${this.postsTopic()}.`);
  }

  private async publishNextBatch() {
    const unpublishedEvents = await this.prisma.outboxEvent.findMany({
      where: {
        publishedAt: null,
      },
      orderBy: [{ createdAt: "asc" }],
      take: 20,
    });

    for (const outboxEvent of unpublishedEvents) {
      const envelope = toPostsEnvelope(outboxEvent);
      await this.producer.send({
        topic: this.postsTopic(),
        messages: [
          {
            key: messageKeyFor(envelope),
            value: JSON.stringify(envelope),
            headers: {
              eventName: envelope.name,
              aggregateId: envelope.aggregateId,
            },
          },
        ],
      });

      await this.prisma.outboxEvent.update({
        where: { id: outboxEvent.id },
        data: {
          publishedAt: new Date(),
        },
      });
    }
  }

  private postsTopic() {
    return process.env.KAFKA_POSTS_TOPIC ?? KAFKA_TOPICS.postsEvents;
  }

  private publishIntervalMs() {
    return Number(process.env.POSTS_OUTBOX_PUBLISH_INTERVAL_MS ?? 1500);
  }

  private async disconnect() {
    await Promise.allSettled([this.producer.disconnect(), this.admin.disconnect()]);
  }
}

function toPostsEnvelope(outboxEvent: {
  id: string;
  aggregateId: string;
  eventType: string;
  createdAt: Date;
  payload: unknown;
}) {
  if (outboxEvent.eventType === DOMAIN_EVENTS.postPublished) {
    return {
      id: outboxEvent.id,
      name: DOMAIN_EVENTS.postPublished,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.createdAt.toISOString(),
      payload: outboxEvent.payload as PostPublishedPayload,
    } satisfies DomainEventEnvelope<PostPublishedPayload, typeof DOMAIN_EVENTS.postPublished>;
  }

  if (outboxEvent.eventType === DOMAIN_EVENTS.postLikeCreated) {
    return {
      id: outboxEvent.id,
      name: DOMAIN_EVENTS.postLikeCreated,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.createdAt.toISOString(),
      payload: outboxEvent.payload as PostLikeCreatedPayload,
    } satisfies DomainEventEnvelope<PostLikeCreatedPayload, typeof DOMAIN_EVENTS.postLikeCreated>;
  }

  if (outboxEvent.eventType === DOMAIN_EVENTS.postLikeRemoved) {
    return {
      id: outboxEvent.id,
      name: DOMAIN_EVENTS.postLikeRemoved,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.createdAt.toISOString(),
      payload: outboxEvent.payload as PostLikeRemovedPayload,
    } satisfies DomainEventEnvelope<PostLikeRemovedPayload, typeof DOMAIN_EVENTS.postLikeRemoved>;
  }

  if (outboxEvent.eventType === DOMAIN_EVENTS.postRepostCreated) {
    return {
      id: outboxEvent.id,
      name: DOMAIN_EVENTS.postRepostCreated,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.createdAt.toISOString(),
      payload: outboxEvent.payload as PostRepostCreatedPayload,
    } satisfies DomainEventEnvelope<PostRepostCreatedPayload, typeof DOMAIN_EVENTS.postRepostCreated>;
  }

  if (outboxEvent.eventType === DOMAIN_EVENTS.postRepostRemoved) {
    return {
      id: outboxEvent.id,
      name: DOMAIN_EVENTS.postRepostRemoved,
      aggregateId: outboxEvent.aggregateId,
      occurredAt: outboxEvent.createdAt.toISOString(),
      payload: outboxEvent.payload as PostRepostRemovedPayload,
    } satisfies DomainEventEnvelope<PostRepostRemovedPayload, typeof DOMAIN_EVENTS.postRepostRemoved>;
  }

  throw new Error(`Unsupported outbox event type: ${outboxEvent.eventType}`);
}

function messageKeyFor(
  envelope:
    | DomainEventEnvelope<PostPublishedPayload, typeof DOMAIN_EVENTS.postPublished>
    | DomainEventEnvelope<PostLikeCreatedPayload, typeof DOMAIN_EVENTS.postLikeCreated>
    | DomainEventEnvelope<PostLikeRemovedPayload, typeof DOMAIN_EVENTS.postLikeRemoved>
    | DomainEventEnvelope<PostRepostCreatedPayload, typeof DOMAIN_EVENTS.postRepostCreated>
    | DomainEventEnvelope<PostRepostRemovedPayload, typeof DOMAIN_EVENTS.postRepostRemoved>,
) {
  if (envelope.name === DOMAIN_EVENTS.postPublished) {
    return envelope.payload.authorUserId;
  }

  return envelope.payload.actorUserId;
}

function kafkaBrokers() {
  return (process.env.KAFKA_BROKERS ?? "127.0.0.1:29092")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Kafka error.";
}
