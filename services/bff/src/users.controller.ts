import { Controller, Get, Inject, Param } from "@nestjs/common";
import { UserSummaryService } from "./user-summary.service";

@Controller("users")
export class UsersController {
  constructor(@Inject(UserSummaryService) private readonly userSummaryService: UserSummaryService) {}

  @Get()
  async listUsers() {
    return this.userSummaryService.listUsers();
  }

  @Get("by-handle/:handle/summary")
  async getUserSummaryByHandle(@Param("handle") handle: string) {
    return this.userSummaryService.getUserSummaryByHandle(handle);
  }

  @Get(":userId/summary")
  async getUserSummary(@Param("userId") userId: string) {
    return this.userSummaryService.getUserSummaryById(userId);
  }
}
