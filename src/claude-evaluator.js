import { buildRulesText } from "./coaching-guidelines.js";

const MAX_ITEMS = 3;

function cleanList(value, field) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ITEMS || value.some(item => typeof item !== "string" || item.length > 280)) {
    throw new Error(`Claude response has an invalid ${field} list.`);
  }
  return value;
}

/** Creates a bounded prompt using only derived reports, never raw transcripts. */
export function buildClaudeEvaluationPrompt({ history, evidence }) {
  const input = {
    history: { totals: history.totals, observed_practice: history.observed_practice },
    verified_evidence: evidence ? {
      overall: evidence.overall,
      dimensions: evidence.dimensions?.map(({ id, name, score, confidence, evidence_count, verified_count }) => ({ id, name, score, confidence, evidence_count, verified_count }))
    } : null
  };

  return `You are an evidence-based engineering development coach. Analyse the JSON below.

Rules:
${buildRulesText()}
- Return ONLY valid JSON with this exact shape:
{"summary":"string","strengths":["string"],"opportunities":["string"],"recommended_next_actions":["string"],"caveats":["string"]}
- "summary" must be at most 600 characters.
- Each list must contain 1–3 items, each at most 250 characters.

Derived evaluation input:
${JSON.stringify(input)}`;
}

/** Strips an optional ```json ... ``` (or bare ```) fence some models wrap responses in. */
function stripCodeFence(text) {
  const match = /^```(?:json)?\s*\n([\s\S]*?)\n?```\s*$/.exec(text.trim());
  return match ? match[1] : text;
}

/** Accepts the inner text returned by `claude -p --output-format json`. */
export function parseClaudeEvaluation(resultText) {
  let value;
  try { value = JSON.parse(stripCodeFence(resultText)); } catch { throw new Error("Claude did not return valid JSON for the evaluation."); }
  if (!value || typeof value !== "object" || typeof value.summary !== "string" || value.summary.length > 700) {
    throw new Error("Claude response is missing a valid summary.");
  }
  return {
    summary: value.summary,
    strengths: cleanList(value.strengths, "strengths"),
    opportunities: cleanList(value.opportunities, "opportunities"),
    recommended_next_actions: cleanList(value.recommended_next_actions, "recommended_next_actions"),
    caveats: cleanList(value.caveats, "caveats")
  };
}
