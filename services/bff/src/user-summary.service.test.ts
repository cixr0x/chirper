import assert from "node:assert/strict";
import test from "node:test";
import { UserSummaryService } from "./user-summary.service";

test("searchUsers enriches identity search results with profile summaries", async () => {
  const identitySearches: unknown[] = [];
  const identityClient = {
    searchUsers: async (query: string, limit: number) => {
      identitySearches.push({ query, limit });
      return [
        {
          userId: "usr_alana",
          handle: "alana",
          displayName: "Alana Pierce",
          status: "active",
        },
      ];
    },
  };
  const profileClient = {
    getProfileByUserId: async (userId: string) => ({
      userId,
      bio: "Timeline designer",
      location: "Monterrey",
      avatarAssetId: "",
      bannerAssetId: "",
      avatarUrl: "https://cdn.example.com/alana.png",
      bannerUrl: "",
      links: [],
    }),
  };
  const service = new UserSummaryService(identityClient as never, profileClient as never);

  const results = await service.searchUsers("al", 5);

  assert.deepEqual(identitySearches, [{ query: "al", limit: 5 }]);
  assert.deepEqual(results, [
    {
      userId: "usr_alana",
      handle: "alana",
      displayName: "Alana Pierce",
      status: "active",
      bio: "Timeline designer",
      location: "Monterrey",
      avatarAssetId: "",
      bannerAssetId: "",
      avatarUrl: "https://cdn.example.com/alana.png",
      bannerUrl: "",
      links: [],
    },
  ]);
});
