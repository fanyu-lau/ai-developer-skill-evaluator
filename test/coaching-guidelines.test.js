import test from "node:test";
import assert from "node:assert/strict";
import { GUIDELINES, buildRulesText, checkGuidelineCompliance } from "../src/coaching-guidelines.js";

const cleanReport = {
  summary: "Investigation before change is a consistent pattern in these sessions.",
  strengths: ["Reads context before editing in most sessions."],
  opportunities: ["Test execution is rarely observed in-session."],
  recommended_next_actions: ["Run tests after each batch of edits."],
  caveats: ["These are workflow patterns only, not a measure of ability."]
};

test("buildRulesText includes every guideline's rule text", () => {
  const text = buildRulesText();
  for (const guideline of GUIDELINES) {
    assert.ok(text.includes(guideline.rule), `missing rule text for ${guideline.id}`);
  }
});

test("a clean report passes the compliance check", () => {
  const result = checkGuidelineCompliance(cleanReport);
  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("catches a banned term naming seniority", () => {
  const result = checkGuidelineCompliance({ ...cleanReport, summary: "This shows senior-level judgment throughout." });
  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].guideline_id, "no_capability_inference");
  assert.equal(result.violations[0].field, "summary");
});

test("catches a banned term inside a list field, not just summary", () => {
  const result = checkGuidelineCompliance({ ...cleanReport, recommended_next_actions: ["This developer should be promoted."] });
  assert.equal(result.passed, false);
  assert.equal(result.violations[0].guideline_id, "no_people_decisions");
  assert.equal(result.violations[0].field, "recommended_next_actions");
});

test("does not flag unrelated text as a violation", () => {
  const result = checkGuidelineCompliance({ ...cleanReport, summary: "This developer promotes good testing habits across sessions." });
  // "promotes" should not match "should be promoted" / "recommend promoting"
  assert.equal(result.passed, true);
});

test("a caveat that correctly names the prohibition does not trigger a false positive", () => {
  // Regression test: a real generated report was flagged for this exact sentence,
  // even though it's the model correctly stating the rule, not breaking it.
  const result = checkGuidelineCompliance({
    ...cleanReport,
    caveats: ["Not valid for hiring, promotion, compensation, or ranking people."]
  });
  assert.equal(result.passed, true);
});
