import test from "node:test";
import assert from "node:assert/strict";
import { buildClaudeEvaluationPrompt, parseClaudeEvaluation } from "../src/claude-evaluator.js";

const history = { totals: { sessions: 12, test_commands: 3 }, observed_practice: { confidence: 100, indicators: { test_execution: 25 } } };
const evidence = { overall: 83, dimensions: [{ id: "testing", name: "Testing", score: 65, confidence: 70, evidence_count: 4, verified_count: 2, ignored: "sensitive" }] };

test("Claude prompt is bounded to derived evidence", () => {
  const prompt = buildClaudeEvaluationPrompt({ history, evidence });
  assert.match(prompt, /test_execution/);
  assert.match(prompt, /Do not rank, hire, promote, compensate, or label/i);
  assert.equal(prompt.includes("sensitive"), false);
  assert.match(prompt, /at most 600 characters/);
  assert.match(prompt, /at most 250 characters/);
});

test("accepts only the expected improvement report shape", () => {
  const report = parseClaudeEvaluation(JSON.stringify({ summary: "Good investigative habits.", strengths: ["Read context first."], opportunities: ["Run targeted tests."], recommended_next_actions: ["Add one regression test."], caveats: ["Activity is not correctness."] }));
  assert.equal(report.strengths.length, 1);
  assert.throws(() => parseClaudeEvaluation(JSON.stringify({ summary: "x", strengths: [], opportunities: [], recommended_next_actions: [], caveats: [] })), /invalid strengths/);
});

test("tolerates a markdown code fence around the JSON", () => {
  const payload = { summary: "Good investigative habits.", strengths: ["Read context first."], opportunities: ["Run targeted tests."], recommended_next_actions: ["Add one regression test."], caveats: ["Activity is not correctness."] };
  const report = parseClaudeEvaluation(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``);
  assert.equal(report.summary, payload.summary);
});
