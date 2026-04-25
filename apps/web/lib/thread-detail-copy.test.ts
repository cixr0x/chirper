import assert from "node:assert/strict";
import test from "node:test";
import { formatParticipantHeading, formatThreadOverviewTimestamp } from "./thread-detail-copy";

test("formats participant heading with singular grammar", () => {
  assert.equal(formatParticipantHeading(1), "1 person involved");
});

test("formats participant heading with plural grammar", () => {
  assert.equal(formatParticipantHeading(2), "2 people involved");
});

test("groups thread overview timestamp into date and non-splitting time", () => {
  assert.deepEqual(formatThreadOverviewTimestamp("Apr 24, 2026, 7:59 PM"), {
    date: "Apr 24, 2026",
    time: "7:59 PM",
  });
});
