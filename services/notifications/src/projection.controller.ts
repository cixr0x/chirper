import { Controller, Post } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("projections/follows")
export class ProjectionController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post("rebuild")
  async rebuildFollowProjection() {
    return this.notifications.rebuildFollowProjection();
  }
}
