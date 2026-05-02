import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { UserSummaryService } from "./user-summary.service";

@Controller("users")
export class UsersController {
  constructor(@Inject(UserSummaryService) private readonly userSummaryService: UserSummaryService) {}

  @Get()
  async listUsers() {
    return this.userSummaryService.listUsers();
  }

  @Get("search")
  async searchUsers(@Query("q") query = "", @Query("limit") limit = "5") {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return [];
    }

    return this.userSummaryService.searchUsers(trimmedQuery, clampSearchLimit(limit));
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

function clampSearchLimit(value: string) {
  const parsedLimit = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedLimit)) {
    return 5;
  }

  return Math.min(Math.max(parsedLimit, 1), 10);
}
