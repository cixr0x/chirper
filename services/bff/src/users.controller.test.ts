import assert from "node:assert/strict";
import test from "node:test";
import { UsersController } from "./users.controller";

test("searchUsers delegates query and numeric limit to user summary service", async () => {
  const searches: unknown[] = [];
  const controller = new UsersController({
    searchUsers: async (query: string, limit: number) => {
      searches.push({ query, limit });
      return [{ userId: "usr_alana", handle: "alana" }];
    },
  } as never);

  const results = await controller.searchUsers("al", "5");

  assert.deepEqual(searches, [{ query: "al", limit: 5 }]);
  assert.deepEqual(results, [{ userId: "usr_alana", handle: "alana" }]);
});

test("searchUsers returns an empty list for short queries", async () => {
  const searches: unknown[] = [];
  const controller = new UsersController({
    searchUsers: async (query: string, limit: number) => {
      searches.push({ query, limit });
      return [];
    },
  } as never);

  const results = await controller.searchUsers("a", "5");

  assert.deepEqual(searches, []);
  assert.deepEqual(results, []);
});
