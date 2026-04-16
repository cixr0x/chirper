import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { RealtimeGrpcController } from "./realtime.grpc.controller";
import { RealtimeService } from "./realtime.service";

@Module({
  controllers: [HealthController, RealtimeGrpcController],
  providers: [RealtimeService],
})
export class AppModule {}
