import test from "node:test";
import assert from "node:assert/strict";
import { buildPromptingFeedbackPrompt } from "../src/prompting-feedback.js";
import { parseClaudeEvaluation } from "../src/claude-evaluator.js";

test("prompt includes the actual sampled prompt text and prompting-focused rules", () => {
  const prompts = [{ occurred_at: "2026-08-10T09:00:00Z", text: "fix the bug" }, { occurred_at: "2026-08-11T09:00:00Z", text: "add tests for the checkout flow with edge cases for empty carts" }];
  const prompt = buildPromptingFeedbackPrompt({ prompts });
  assert.match(prompt, /fix the bug/);
  assert.match(prompt, /add tests for the checkout flow/);
  assert.match(prompt, /prompting technique/i);
  assert.match(prompt, /Do not infer or comment on the developer's coding skill/);
  assert.match(prompt, /Do not rank, hire, promote, compensate, or label a person/);
  assert.match(prompt, /at most 600 characters/);
  assert.match(prompt, /at most 250 characters/);
});

test("a custom criteria string is added as a focus area, not a replacement for the guardrails", () => {
  const prompts = [{ occurred_at: "2026-08-10T09:00:00Z", text: "fix the bug" }];
  const prompt = buildPromptingFeedbackPrompt({ prompts, criteria: "Check whether I name an expected test for every change." });
  assert.match(prompt, /The developer also asked you to specifically evaluate this: Check whether I name an expected test/);
  assert.match(prompt, /Do not rank, hire, promote, compensate, or label a person/);
  assert.match(prompt, /Do not infer or comment on the developer's coding skill/);
});

test("no criteria supplied omits the custom focus line entirely", () => {
  const prompts = [{ occurred_at: "2026-08-10T09:00:00Z", text: "fix the bug" }];
  const prompt = buildPromptingFeedbackPrompt({ prompts });
  assert.doesNotMatch(prompt, /The developer also asked you to specifically evaluate/);
});

test("the response contract matches the shared coaching report parser", () => {
  const report = parseClaudeEvaluation(JSON.stringify({
    summary: "Prompts are generally clear but often omit acceptance criteria.",
    strengths: ["Prompts reference specific files or errors."],
    opportunities: ["Several prompts read as \"fix the bug\" without describing the expected behaviour."],
    recommended_next_actions: ["State the expected outcome or a test that should pass."],
    caveats: ["Based on a small sample of recent prompts only."]
  }));
  assert.equal(report.strengths.length, 1);
});
