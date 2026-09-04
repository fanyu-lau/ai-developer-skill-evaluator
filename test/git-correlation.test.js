import test from "node:test";
import assert from "node:assert/strict";
import { correlateSessionsWithPullRequests } from "../src/git-correlation.js";

const session = (overrides = {}) => ({ session_ref: "abc", first_activity_at: "2026-08-10T09:00:00Z", last_activity_at: "2026-08-10T10:00:00Z", ...overrides });

test("a session near an approved, CI-passed PR's commit is matched", () => {
  const pulls = [{ review_decision: "APPROVED", ci_conclusion: "SUCCESS", commit_timestamps: ["2026-08-10T11:00:00Z"] }];
  const { matched, unmatched } = correlateSessionsWithPullRequests([session()], pulls);
  assert.equal(matched.length, 1);
  assert.equal(unmatched.length, 0);
});

test("a session far outside the time window stays unmatched", () => {
  const pulls = [{ review_decision: "APPROVED", ci_conclusion: "SUCCESS", commit_timestamps: ["2026-09-01T11:00:00Z"] }];
  const { matched, unmatched } = correlateSessionsWithPullRequests([session()], pulls);
  assert.equal(matched.length, 0);
  assert.equal(unmatched.length, 1);
});

test("a nearby PR that was not approved does not count as a match", () => {
  const pulls = [{ review_decision: "CHANGES_REQUESTED", ci_conclusion: "SUCCESS", commit_timestamps: ["2026-08-10T11:00:00Z"] }];
  const { matched, unmatched } = correlateSessionsWithPullRequests([session()], pulls);
  assert.equal(matched.length, 0);
  assert.equal(unmatched.length, 1);
});

test("a nearby PR that failed CI does not count as a match", () => {
  const pulls = [{ review_decision: "APPROVED", ci_conclusion: "FAILURE", commit_timestamps: ["2026-08-10T11:00:00Z"] }];
  const { matched, unmatched } = correlateSessionsWithPullRequests([session()], pulls);
  assert.equal(matched.length, 0);
  assert.equal(unmatched.length, 1);
});

test("no pull requests leaves every session unmatched", () => {
  const { matched, unmatched } = correlateSessionsWithPullRequests([session()], []);
  assert.equal(matched.length, 0);
  assert.equal(unmatched.length, 1);
});
