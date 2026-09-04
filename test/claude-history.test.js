import test from "node:test";
import assert from "node:assert/strict";
import { classifyEditOutcomes, createHistoryReport, gradeAiCollaboration, observedPracticeEvents, summariseClaudeTranscript } from "../src/claude-history.js";

const transcript = [
  { type: "user", sessionId: "secret-session", timestamp: "2026-08-10T09:00:00Z", message: { content: "Customer data and prompt text" } },
  { type: "assistant", sessionId: "secret-session", timestamp: "2026-08-10T09:01:00Z", message: { content: [{ type: "thinking", thinking: "private reasoning" }, { type: "tool_use", name: "Read", input: { file_path: "/private/app.js" } }, { type: "tool_use", name: "Edit", input: { replace_all: false } }, { type: "tool_use", name: "Bash", input: { command: "npm test -- --token=secret" } }] } },
  { type: "user", sessionId: "secret-session", timestamp: "2026-08-10T09:02:00Z", message: { content: "Follow-up" } }
].map(JSON.stringify).join("\n");

test("history import retains only derived workflow metrics", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  assert.deepEqual(summary, {
    session_ref: summary.session_ref, first_activity_at: "2026-08-10T09:00:00Z", last_activity_at: "2026-08-10T09:02:00Z",
    user_turns: 2, assistant_turns: 1, thinking_blocks: 1, reads: 1, edits: 1, writes: 0, commands: 1, test_commands: 1, other_tools: 0,
    edit_outcomes: { used_directly: 1, modified: 0, rejected: 0 }
  });
  assert.equal(JSON.stringify(summary).match(/private|secret|npm|app\.js/), null);
});

test("classifyEditOutcomes: only an immediately following edit counts as a revision", () => {
  assert.deepEqual(classifyEditOutcomes(["edit", "edit"]), { used_directly: 1, modified: 1, rejected: 0 });
  assert.deepEqual(classifyEditOutcomes(["edit", "read", "edit"]), { used_directly: 2, modified: 0, rejected: 0 });
});

test("classifyEditOutcomes: a revert before the next edit (or session end) is rejected", () => {
  assert.deepEqual(classifyEditOutcomes(["edit", "bash", "revert"]), { used_directly: 0, modified: 0, rejected: 1 });
});

test("classifyEditOutcomes: no follow-up edit or revert means it stood", () => {
  assert.deepEqual(classifyEditOutcomes(["edit", "read", "bash"]), { used_directly: 1, modified: 0, rejected: 0 });
});

test("classifyEditOutcomes: a revert before the next edit boundary wins over that later edit", () => {
  assert.deepEqual(classifyEditOutcomes(["edit", "revert", "edit"]), { used_directly: 1, modified: 0, rejected: 1 });
});

test("report labels historical observations as provisional", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  const report = createHistoryReport([summary]);
  assert.equal(report.privacy.raw_transcripts_stored, false);
  assert.equal(report.observed_practice.assessment_type, "provisional_observed_practice");
  assert.match(report.observed_practice.interpretation.join(" "), /must not be used for hiring/i);
});

test("report retains only privacy-safe per-session fields for correlation", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  const report = createHistoryReport([summary]);
  assert.equal(report.sessions.length, 1);
  assert.deepEqual(Object.keys(report.sessions[0]).sort(), ["assistant_turns", "edits", "first_activity_at", "last_activity_at", "reads", "session_ref", "test_commands", "user_turns", "writes"].sort());
  assert.equal(JSON.stringify(report.sessions).match(/private|secret|npm|app\.js/), null);
});

test("observed practice indicators become low-weight evidence events by default", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  const report = createHistoryReport([summary]);
  const events = observedPracticeEvents(report);
  assert.equal(events.length, 4);
  assert.ok(events.every(event => event.verification === "observed"));
  assert.ok(events.every(event => Number.isFinite(event.signal_score)));
  assert.deepEqual(new Set(events.map(event => event.competency)), new Set(["problem_solving", "testing", "ai_collaboration"]));
});

test("a caller can promote observed practice events to a stronger verification tier", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  const report = createHistoryReport([summary]);
  const events = observedPracticeEvents(report, { verification: "verified", idPrefix: "hist_verified" });
  assert.ok(events.every(event => event.verification === "verified"));
  assert.ok(events.every(event => event.id.startsWith("hist_verified_")));
});

test("no sessions analysed yields no history-derived events", () => {
  const events = observedPracticeEvents(createHistoryReport([]));
  assert.deepEqual(events, []);
});

test("gradeAiCollaboration aggregates edit_outcomes across sessions into percentages", () => {
  const sessions = [
    { edit_outcomes: { used_directly: 3, modified: 1, rejected: 0 } },
    { edit_outcomes: { used_directly: 1, modified: 0, rejected: 5 } }
  ];
  const practice = gradeAiCollaboration(sessions);
  assert.equal(practice.edits_analysed, 10);
  assert.equal(practice.indicators.used_directly, 40);
  assert.equal(practice.indicators.modified, 10);
  assert.equal(practice.indicators.rejected, 50);
});

test("createHistoryReport includes ai_collaboration derived from real sessions", () => {
  const summary = summariseClaudeTranscript(transcript, { installationId: "local-salt" });
  const report = createHistoryReport([summary]);
  assert.equal(report.ai_collaboration.assessment_type, "approximate_workflow_pattern");
  assert.equal(report.ai_collaboration.edits_analysed, 1);
  assert.match(report.ai_collaboration.interpretation.join(" "), /must not be used for hiring/i);
});
