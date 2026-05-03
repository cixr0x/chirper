import assert from "node:assert/strict";
import test from "node:test";
import { GraphService } from "./graph.service";

function createService(findFirst: (query: unknown) => Promise<unknown>) {
  const prisma = {
    block: {
      findFirst,
    },
  };

  return new GraphService(prisma as never);
}

test("hasBlockBetween returns true when first user blocked the second", async () => {
  const queries: unknown[] = [];
  const service = createService(async (query) => {
    queries.push(query);
    return { id: "block_1" };
  });

  const blocked = await service.hasBlockBetween(" usr_a ", " usr_b ");

  assert.equal(blocked, true);
  assert.deepEqual(queries, [
    {
      where: {
        OR: [
          { blockerId: "usr_a", blockedId: "usr_b" },
          { blockerId: "usr_b", blockedId: "usr_a" },
        ],
      },
    },
  ]);
});

test("hasBlockBetween returns true when second user blocked the first", async () => {
  const service = createService(async (query) => {
    assert.deepEqual(query, {
      where: {
        OR: [
          { blockerId: "usr_a", blockedId: "usr_b" },
          { blockerId: "usr_b", blockedId: "usr_a" },
        ],
      },
    });
    return { id: "block_2" };
  });

  assert.equal(await service.hasBlockBetween("usr_a", "usr_b"), true);
});

test("hasBlockBetween returns false when neither user blocked the other", async () => {
  const service = createService(async () => null);

  assert.equal(await service.hasBlockBetween("usr_a", "usr_b"), false);
});

test("hasBlockBetween returns false for empty ids without querying blocks", async () => {
  let queryCount = 0;
  const service = createService(async () => {
    queryCount += 1;
    return { id: "block_1" };
  });

  assert.equal(await service.hasBlockBetween("", "usr_b"), false);
  assert.equal(await service.hasBlockBetween("usr_a", " "), false);
  assert.equal(queryCount, 0);
});
