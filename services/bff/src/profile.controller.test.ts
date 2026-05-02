import assert from "node:assert/strict";
import test from "node:test";
import { ProfileController } from "./profile.controller";

test("profile update saves submitted avatar and banner URLs directly", async () => {
  const profileUpdates: unknown[] = [];
  const profileClient = {
    getProfileByUserId: async () => ({
      avatarAssetId: "asset_existing_avatar",
      bannerAssetId: "asset_existing_banner",
      avatarUrl: "",
      bannerUrl: "",
    }),
    updateProfile: async (request: unknown) => {
      profileUpdates.push(request);
    },
  };
  const sessionAuth = {
    requireSession: async () => ({ userId: "user_1" }),
  };
  const userSummaryService = {
    getUserSummaryById: async () => ({ userId: "user_1" }),
  };
  const controller = new ProfileController(
    profileClient as never,
    sessionAuth as never,
    userSummaryService as never,
  );

  await controller.updateProfile("session_1", {
    bio: "Bio",
    location: "Monterrey",
    avatarSourceUrl: "https://cdn.example.com/avatar.png",
    bannerSourceUrl: "https://cdn.example.com/banner.jpg",
    links: [],
  });

  assert.deepEqual(profileUpdates, [
    {
      userId: "user_1",
      bio: "Bio",
      location: "Monterrey",
      avatarAssetId: "",
      bannerAssetId: "",
      avatarUrl: "https://cdn.example.com/avatar.png",
      bannerUrl: "https://cdn.example.com/banner.jpg",
      links: [],
    },
  ]);
});
