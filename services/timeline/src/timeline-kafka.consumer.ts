import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  KAFKA_TOPICS,
  isGraphFollowCreatedEvent,
  isGraphFollowRemovedEvent,
  isPostDeletedEvent,
  isPostRepostCreatedEvent,
  isPostRepostRemovedEvent,
  isPostPublishedEvent,
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

  constructor(@Inject(TimelineService) private readonly timelineService: TimelineService) {}

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
            {
              topic: this.graphTopic(),
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
        await this.consumer.subscribe({
          topic: this.graphTopic(),
          fromBeginning: true,
        });

        this.logger.log(`Kafka consumer subscribed to ${this.postsTopic()} and ${this.graphTopic()}.`);

        await this.consumer.run({
          eachMessage: async ({ message }) => {
            const raw = parseJson(message.value);
            if (!raw) {
              return;
            }

            if (isPostPublishedEvent(raw)) {
              await this.timelineService.consumePostPublishedEvent(raw);
              return;
            }

            if (isPostDeletedEvent(raw)) {
              await this.timelineService.consumePostDeletedEvent(raw);
              return;
            }

            if (isPostRepostCreatedEvent(raw)) {
              await this.timelineService.consumePostRepostCreatedEvent(raw);
              return;
            }

            if (isPostRepostRemovedEvent(raw)) {
              await this.timelineService.consumePostRepostRemovedEvent(raw);
              return;
            }

            if (isGraphFollowCreatedEvent(raw)) {
              await this.timelineService.consumeGraphFollowCreatedEvent(raw);
              return;
            }

            if (isGraphFollowRemovedEvent(raw)) {
              await this.timelineService.consumeGraphFollowRemovedEvent(raw);
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

  private postsTopic() {
    return process.env.KAFKA_POSTS_TOPIC ?? KAFKA_TOPICS.postsEvents;
  }

  private graphTopic() {
    return process.env.KAFKA_GRAPH_TOPIC ?? KAFKA_TOPICS.graphEvents;
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
