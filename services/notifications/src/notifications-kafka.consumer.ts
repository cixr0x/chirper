import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  KAFKA_TOPICS,
  isGraphFollowCreatedEvent,
  isPostPublishedEvent,
} from "@chirper/contracts-events";
import { Consumer, Kafka, logLevel } from "kafkajs";
import { NotificationsService } from "./notifications.service";

@Injectable()
export class NotificationsKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsKafkaConsumerService.name);
  private readonly kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? "chirper-notifications",
    brokers: kafkaBrokers(),
    logLevel: logLevel.NOTHING,
  });
  private readonly admin = this.kafka.admin();
  private readonly consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_CONSUMER_GROUP ?? "chirper-notifications-service",
  });
  private running = false;
  private loopPromise?: Promise<void>;

  constructor(private readonly notifications: NotificationsService) {}

  onModuleInit() {
    this.running = true;
    this.loopPromise = this.startConsumerWithRetry();
  }

  async onModuleDestroy() {
    this.running = false;
    await Promise.allSettled([this.consumer.stop(), this.consumer.disconnect(), this.admin.disconnect()]);
    await this.loopPromise?.catch(() => undefined);
  }

  private async startConsumerWithRetry() {
    while (this.running) {
      try {
        await this.admin.connect();
        await this.admin.createTopics({
          waitForLeaders: true,
          topics: [
            {
              topic: process.env.KAFKA_POSTS_TOPIC ?? KAFKA_TOPICS.postsEvents,
              numPartitions: 3,
              replicationFactor: 1,
            },
            {
              topic: process.env.KAFKA_GRAPH_TOPIC ?? KAFKA_TOPICS.graphEvents,
              numPartitions: 3,
              replicationFactor: 1,
            },
          ],
        });

        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: process.env.KAFKA_POSTS_TOPIC ?? KAFKA_TOPICS.postsEvents,
          fromBeginning: true,
        });
        await this.consumer.subscribe({
          topic: process.env.KAFKA_GRAPH_TOPIC ?? KAFKA_TOPICS.graphEvents,
          fromBeginning: true,
        });

        this.logger.log("Kafka consumer subscribed to posts and graph topics.");

        await this.consumer.run({
          eachMessage: async ({ message }) => {
            const raw = parseJson(message.value);
            if (!raw) {
              return;
            }

            if (isPostPublishedEvent(raw)) {
              await this.notifications.consumePostPublishedEvent(raw);
              return;
            }

            if (isGraphFollowCreatedEvent(raw)) {
              await this.notifications.consumeGraphFollowCreatedEvent(raw);
            }
          },
        });

        await this.admin.disconnect();
        return;
      } catch (error) {
        this.logger.warn(`Kafka consumer paused: ${messageFromError(error)}`);
        await Promise.allSettled([this.consumer.disconnect(), this.admin.disconnect()]);
        await sleep(2000);
      }
    }
  }
}

function parseJson(value: Buffer | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value.toString("utf8")) as unknown;
  } catch {
    return null;
  }
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
