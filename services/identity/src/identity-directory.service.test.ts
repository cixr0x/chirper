import assert from "node:assert/strict";
import test from "node:test";
import { IdentityDirectoryService } from "./identity-directory.service";

const users = [
  { id: "usr_alana", handle: "alana", displayName: "Alana Pierce" },
  { id: "usr_alex", handle: "alex", displayName: "Project Lead" },
  { id: "usr_sally", handle: "sally", displayName: "Albright Sally" },
  { id: "usr_paloma", handle: "paloma", displayName: "Paloma Cruz" },
  { id: "usr_omar", handle: "omar", displayName: "Omar Chavez" },
];

function createDirectory() {
  const prisma = {
    user: {
      findMany: async () => users,
    },
  };

  return new IdentityDirectoryService(prisma as never);
}

test("searchUsers matches handles and display names with deterministic ranking", async () => {
  const directory = createDirectory();

  const results = await directory.searchUsers("AL", 5);

  assert.deepEqual(
    results.map((user) => user.handle),
    ["alana", "alex", "sally", "paloma"],
  );
});

test("searchUsers respects the requested result limit", async () => {
  const directory = createDirectory();

  const results = await directory.searchUsers("al", 2);

  assert.deepEqual(
    results.map((user) => user.handle),
    ["alana", "alex"],
  );
});

test("searchUsers ignores queries shorter than two characters", async () => {
  const directory = createDirectory();

  const results = await directory.searchUsers("a", 5);

  assert.deepEqual(results, []);
});
