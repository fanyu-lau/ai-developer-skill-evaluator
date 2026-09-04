const MAX_CRITERIA_CHARS = 500;

/**
 * Builds a prompt that sends the developer's own sampled prompt text to Claude for
 * prompting-technique feedback. Unlike every other coaching prompt in this project,
 * this one sends raw text, not derived metrics — callers must gate this behind an
 * explicit, separately-named consent flag (see scripts/evaluate-prompting.js).
 *
 * `criteria` is optional, developer-supplied text naming what they specifically want
 * evaluated (e.g. "whether I name the file and an expected test"). It only ever adds
 * a focus area on top of the fixed rules below — it can't be used to relax the
 * no-ranking / no-skill-inference guardrails, since those are written unconditionally.
 */
export function buildPromptingFeedbackPrompt({ prompts, criteria = null }) {
  const examples = prompts.map((prompt, index) => `${index + 1}. ${prompt.text}`).join("\n");
  const trimmedCriteria = typeof criteria === "string" ? criteria.trim().slice(0, MAX_CRITERIA_CHARS) : null;

  const rules = [
    "Focus only on prompting technique: clarity, specificity, context provided, stated acceptance criteria, and whether a prompt is likely to need clarification versus being actionable as written.",
    trimmedCriteria && `The developer also asked you to specifically evaluate this: ${trimmedCriteria}`,
    "Do not infer or comment on the developer's coding skill, seniority, intent, productivity, or employment performance from these prompts.",
    "Ground feedback in the actual examples below — you may quote short fragments — rather than giving generic prompting advice.",
    "Do not rank, hire, promote, compensate, or label a person.",
    "Return ONLY valid JSON with this exact shape:\n{\"summary\":\"string\",\"strengths\":[\"string\"],\"opportunities\":[\"string\"],\"recommended_next_actions\":[\"string\"],\"caveats\":[\"string\"]}",
    "\"summary\" must be at most 600 characters.",
    "Each list must contain 1–3 items, each at most 250 characters."
  ].filter(Boolean);

  return `You are a coach helping a developer write more effective prompts for an AI coding assistant (Claude Code).

Rules:
- ${rules.join("\n- ")}

Here are ${prompts.length} of the developer's own recent prompts to Claude Code, in their own words:
${examples}`;
}
