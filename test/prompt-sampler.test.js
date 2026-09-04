import test from "node:test";
import assert from "node:assert/strict";
import { extractUserPrompts } from "../src/prompt-sampler.js";

const line = entry => JSON.stringify(entry);

test("extracts a plain string prompt", () => {
  const transcript = [line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: "Fix the flaky login test" } })].join("\n");
  const prompts = extractUserPrompts(transcript);
  assert.deepEqual(prompts, [{ occurred_at: "2026-08-10T09:00:00Z", text: "Fix the flaky login test" }]);
});

test("extracts a text block from array content", () => {
  const transcript = [line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: [{ type: "text", text: "Add a retry to the network client" }] } })].join("\n");
  const prompts = extractUserPrompts(transcript);
  assert.equal(prompts[0].text, "Add a retry to the network client");
});

test("skips synthetic tool_result-only user turns", () => {
  const transcript = [line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: [{ type: "tool_result", tool_use_id: "abc", content: "file contents here" }] } })].join("\n");
  assert.deepEqual(extractUserPrompts(transcript), []);
});

test("skips non-user entries and blank content", () => {
  const transcript = [
    line({ type: "assistant", message: { content: [{ type: "text", text: "Sure, I'll do that." }] } }),
    line({ type: "user", timestamp: "2026-08-10T09:01:00Z", message: { content: "   " } })
  ].join("\n");
  assert.deepEqual(extractUserPrompts(transcript), []);
});

test("strips IDE-injected notices and skips entries with no authored content left", () => {
  const transcript = [
    line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: "<ide_opened_file>The user opened the file README.md in the IDE.</ide_opened_file>" } }),
    line({ type: "user", timestamp: "2026-08-10T09:01:00Z", message: { content: "<ide_opened_file>The user opened the file README.md in the IDE.</ide_opened_file>what commands do I run?" } })
  ].join("\n");
  const prompts = extractUserPrompts(transcript);
  assert.equal(prompts.length, 1);
  assert.equal(prompts[0].text, "what commands do I run?");
});

test("skips Claude Code's own interruption marker", () => {
  const transcript = [line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: "[Request interrupted by user]" } })].join("\n");
  assert.deepEqual(extractUserPrompts(transcript), []);
});

test("truncates long prompts to maxCharsPerPrompt", () => {
  const transcript = [line({ type: "user", timestamp: "2026-08-10T09:00:00Z", message: { content: "x".repeat(1000) } })].join("\n");
  const prompts = extractUserPrompts(transcript, { maxCharsPerPrompt: 50 });
  assert.equal(prompts[0].text.length, 50);
});
