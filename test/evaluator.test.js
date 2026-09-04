import test from "node:test";
import assert from "node:assert/strict";
import { createEvidenceTimeline, evaluateProfile } from "../src/evaluator.js";

const event = (overrides = {}) => ({
  occurred_at: "2026-08-01T10:00:00Z", competency: "debugging", signal_score: 80,
  verification: "verified", outcome: "positive", title: "Investigated incident", summary: "Checked the evidence.", ...overrides
});

test("weights verified evidence above merely observed evidence", () => {
  const profile = evaluateProfile([event({ signal_score: 90 }), event({ signal_score: 10, verification: "observed" })]);
  assert.equal(profile.dimensions.find(dimension => dimension.id === "debugging").score, 62);
});

test("does not give a score to competencies without evidence", () => {
  const profile = evaluateProfile([event()]);
  assert.equal(profile.dimensions.find(dimension => dimension.id === "testing").score, null);
  assert.equal(profile.overall, 80);
});

test("timeline keeps corroborated or verified evidence, newest first", () => {
  const timeline = createEvidenceTimeline([event({ occurred_at: "2026-08-01T10:00:00Z" }), event({ occurred_at: "2026-08-02T10:00:00Z", title: "Newer" }), event({ occurred_at: "2026-08-03T10:00:00Z", verification: "observed" })]);
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].title, "Newer");
});
