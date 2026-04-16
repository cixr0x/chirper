import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  KAFKA_TOPICS,
  isPostPublishedEvent,
  type PostPublishedEvent,
} from "@chirper/contracts-events";
import { Consumer, Kafka, logLevel } from "kafkajs";
import { TimelineService } from "./timeline.service";

@Injectable()
export class TimelineKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TimelineKafkaConsumerService.name);
  private readonly kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? "chirper-timeline",
    brokers: kafkaBrokers(),
    logLevel: logLevel.NOTHING,
  });
  private readonly admin = this.kafka.admin();
  private readonly consumer: Consumer = this.kafka.consumer({
    groupId: process.env.KAFKA_CONSUMER_GROUP ?? "chirper-timeline-service",
  });
  private running = false;
  private loopPromise?: Promise<void>;

  constructor(private readonly timelineService: TimelineService) {}

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
              topic: this.postsTopic(),
              numPartitions: 3,
              replicationFactor: 1,
            },
          ],
        });
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: this.postsTopic(),
          fromBeginning: true,
        });

        this.logger.log(`Kafka consumer subscribed to ${this.postsTopic()}.`);

        await this.consumer.run({
          eachMessage: async ({ message }) => {
            const event = parsePostPublishedEvent(message.value);
            if (!event) {
              return;
            }

            await this.timelineService.consumePostPublishedEvent(event);
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

  private postsTopic() {
    return process.env.KAFKA_POSTS_TOPIC ?? KAFKA_TOPICS.postsEvents;
  }
}

function parsePostPublishedEvent(value: Buffer | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value.toString("utf8")) as unknown;
    if (!isPostPublishedEvent(parsed)) {
      return null;
    }

    return parsed as PostPublishedEvent;
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
