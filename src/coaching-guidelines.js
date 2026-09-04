/**
 * The rules every coaching prompt in this project is supposed to follow, written once
 * here instead of duplicated as prose inside each prompt string. Guidelines with
 * `banned_terms` get an automated check (checkGuidelineCompliance) — a "code grader"
 * that scans generated text for a concrete signal the rule was broken. Guidelines
 * without `banned_terms` state a judgment call (e.g. "explain uncertainty clearly")
 * that no simple text scan can verify; they're still written into the prompt, just
 * not machine-checked.
 */
export const GUIDELINES = [
  {
    id: "no_capability_inference",
    rule: "Treat historical workflow signals as provisional; never infer code quality, seniority, intent, productivity, employment performance, or business impact.",
    banned_terms: ["senior engineer", "senior-level", "junior engineer", "junior-level", "high performer", "top performer", "productivity score"],
  },
  {
    id: "no_people_decisions",
    rule: "Do not rank, hire, promote, compensate, or label a person.",
    // Phrases, not bare words: a caveat correctly saying "not valid for hiring,
    // promotion, compensation, or ranking" must NOT trip this — that's the model
    // stating the prohibition, not breaking it. Every term here is scoped to only
    // match an actual recommendation or judgment about the person.
    banned_terms: ["should be hired", "should be promoted", "should be compensated", "recommend hiring", "recommend promoting", "recommend compensating", "deserves a raise", "deserves compensation", "ranked #", "top of the team", "bottom of the team"],
  },
  {
    id: "separate_evidence_tiers",
    rule: "Separate verified evidence from observed activity. Explain uncertainty clearly.",
  },
  {
    id: "actionable_next_steps",
    rule: "Give constructive, specific actions the developer can take in their next 1–2 weeks.",
  },
];

export function buildRulesText() {
  return GUIDELINES.map(g => `- ${g.rule}`).join("\n");
}

const TEXT_FIELDS = ["summary", "strengths", "opportunities", "recommended_next_actions", "caveats"];

function fieldText(report, field) {
  const value = report?.[field];
  if (Array.isArray(value)) return value.join(" \n ");
  return typeof value === "string" ? value : "";
}

/**
 * A code grader for generated coaching text: it can only catch the guidelines above
 * that have a `banned_terms` list, and only exact substring matches — it cannot judge
 * whether uncertainty was "explained clearly" or an action was "specific". A pass
 * here is evidence the response avoided known bad phrasings, not proof it's good.
 */
export function checkGuidelineCompliance(report) {
  const violations = [];
  for (const guideline of GUIDELINES) {
    if (!guideline.banned_terms) continue;
    for (const field of TEXT_FIELDS) {
      const text = fieldText(report, field).toLowerCase();
      for (const term of guideline.banned_terms) {
        if (text.includes(term.toLowerCase())) {
          violations.push({ guideline_id: guideline.id, field, term });
        }
      }
    }
  }
  return { passed: violations.length === 0, violations };
}
