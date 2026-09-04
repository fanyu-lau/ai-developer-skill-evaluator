import test from "node:test";
import assert from "node:assert/strict";
import { minimiseClaudeHook, summariseClaudeActivity } from "../src/claude-collector.js";

const rawHook = {
  hook_event_name: "PostToolUse",
  session_id: "session-with-private-context",
  cwd: "/private/customer/project",
  tool_name: "Bash",
  transcript_path: "/private/transcript.jsonl",
  tool_input: { command: "npm test -- --token=secret" },
  tool_response: "raw source or logs"
};

test("Claude collector removes sensitive hook fields", () => {
  const event = minimiseClaudeHook(rawHook, { installationId: "local-only-salt", now: new Date("2026-08-12T00:00:00Z") });
  assert.deepEqual(Object.keys(event).sort(), ["activity", "captured_at", "id", "project_ref", "schema_version", "session_ref", "source", "status", "tool"].sort());
  assert.equal(event.activity, "tool_completed");
  assert.notEqual(event.session_ref, rawHook.session_id);
  assert.notEqual(event.project_ref, rawHook.cwd);
  assert.equal(JSON.stringify(event).includes("secret"), false);
});

test("unsupported hook events are ignored", () => {
  assert.equal(minimiseClaudeHook({ hook_event_name: "UserPromptSubmit" }, { installationId: "local-only-salt" }), null);
});

test("Claude activity is not misrepresented as a skill score", () => {
  const event = minimiseClaudeHook(rawHook, { installationId: "local-only-salt" });
  const summary = summariseClaudeActivity([event]);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.tools_used.Bash, 1);
  assert.match(summary.scoring_note, /not treated as evidence of skill/i);
});
