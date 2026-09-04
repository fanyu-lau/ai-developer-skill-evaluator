/**
 * Builds a prompt that sends the developer's own sampled prompt text to Claude for
 * prompting-technique feedback. Unlike every other coaching prompt in this project,
 * this one sends raw text, not derived metrics — callers must gate this behind an
 * explicit, separately-named consent flag (see scripts/evaluate-prompting.js).
 */
export function buildPromptingFeedbackPrompt({ prompts }) {
  const examples = prompts.map((prompt, index) => `${index + 1}. ${prompt.text}`).join("\n");

  return `You are a coach helping a developer write more effective prompts for an AI coding assistant (Claude Code).

Rules:
- Focus only on prompting technique: clarity, specificity, context provided, stated acceptance criteria, and whether a prompt is likely to need clarification versus being actionable as written.
- Do not infer or comment on the developer's coding skill, seniority, intent, productivity, or employment performance from these prompts.
- Ground feedback in the actual examples below — you may quote short fragments — rather than giving generic prompting advice.
- Do not rank, hire, promote, compensate, or label a person.
- Return ONLY valid JSON with this exact shape:
{"summary":"string","strengths":["string"],"opportunities":["string"],"recommended_next_actions":["string"],"caveats":["string"]}
- "summary" must be at most 600 characters.
- Each list must contain 1–3 items, each at most 250 characters.

Here are ${prompts.length} of the developer's own recent prompts to Claude Code, in their own words:
${examples}`;
}
