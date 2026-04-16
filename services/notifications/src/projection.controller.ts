import { Controller, Inject, Post } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("projections/follows")
export class ProjectionController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Post("rebuild")
  async rebuildFollowProjection() {
    return this.notifications.rebuildFollowProjection();
  }
}
