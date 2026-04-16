import { Controller, Post } from "@nestjs/common";
import { TimelineService } from "./timeline.service";

@Controller("projections/follows")
export class ProjectionController {
  constructor(private readonly timeline: TimelineService) {}

  @Post("rebuild")
  async rebuildFollowProjection() {
    return this.timeline.rebuildFollowProjection();
  }
}
