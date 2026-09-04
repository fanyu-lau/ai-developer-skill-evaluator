import { createHash, randomBytes } from "node:crypto";

const TEST_COMMAND = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|lint)|\b(pytest|vitest|jest|mocha|ava|rspec|go\s+test|cargo\s+test|flutter\s+test|gradle\s+test|mvn\s+test)\b/i;
const REVERT_COMMAND = /\bgit\s+(checkout|reset|restore|revert)\b/i;

function hash(value, salt) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 16);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Classifies a sequence of tool "kinds" (edit/revert/other — never file paths or
 * command text) into what happened after each edit. For each edit: if the very next
 * tool call is another edit, it's a quick revision ("modified"); otherwise, if a
 * revert-pattern command occurs before the next edit (or session end), it was undone
 * ("rejected"); otherwise it stood ("used_directly"). This is a coarse, session-level
 * pattern — it cannot see which file was touched, so an unrelated edit immediately
 * after still counts as "modified", and a revert separated by a Read/Bash call is
 * still attributed to the edit before it.
 */
export function classifyEditOutcomes(toolSequence) {
  const outcomes = { used_directly: 0, modified: 0, rejected: 0 };
  for (let i = 0; i < toolSequence.length; i++) {
    if (toolSequence[i] !== "edit") continue;
    let outcome = "used_directly";
    if (toolSequence[i + 1] === "edit") {
      outcome = "modified";
    } else {
      for (let j = i + 1; j < toolSequence.length && toolSequence[j] !== "edit"; j++) {
        if (toolSequence[j] === "revert") { outcome = "rejected"; break; }
      }
    }
    outcomes[outcome] += 1;
  }
  return outcomes;
}

/**
 * Analyses one Claude Code JSONL transcript in memory. The returned record has
 * deliberately no message content, shell command, cwd, transcript path, code,
 * user prompt, tool input or tool output.
 */
export function summariseClaudeTranscript(lines, { installationId = randomBytes(32).toString("hex") } = {}) {
  const summary = {
    session_ref: null,
    first_activity_at: null,
    last_activity_at: null,
    user_turns: 0,
    assistant_turns: 0,
    thinking_blocks: 0,
    reads: 0,
    edits: 0,
    writes: 0,
    commands: 0,
    test_commands: 0,
    other_tools: 0
  };
  const toolSequence = [];

  for (const line of lines.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (!summary.session_ref && typeof entry.sessionId === "string") summary.session_ref = hash(entry.sessionId, installationId);
    if (typeof entry.timestamp === "string") {
      summary.first_activity_at ??= entry.timestamp;
      summary.last_activity_at = entry.timestamp;
    }
    if (entry.type === "user") summary.user_turns += 1;
    if (entry.type !== "assistant") continue;
    summary.assistant_turns += 1;
    for (const item of entry.message?.content ?? []) {
      if (item.type === "thinking") summary.thinking_blocks += 1;
      if (item.type !== "tool_use") continue;
      if (item.name === "Read") { summary.reads += 1; toolSequence.push("read"); }
      else if (item.name === "Edit") { summary.edits += 1; toolSequence.push("edit"); }
      else if (item.name === "Write") { summary.writes += 1; toolSequence.push("edit"); }
      else if (item.name === "Bash") {
        summary.commands += 1;
        // Inspect only long enough to classify a command; never return it.
        const command = item.input?.command;
        if (typeof command === "string" && TEST_COMMAND.test(command)) summary.test_commands += 1;
        toolSequence.push(typeof command === "string" && REVERT_COMMAND.test(command) ? "revert" : "bash");
      } else { summary.other_tools += 1; toolSequence.push("other"); }
    }
  }
  summary.edit_outcomes = classifyEditOutcomes(toolSequence);
  return summary.session_ref ? summary : null;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

export function gradeObservedPractice(sessions) {
  const active = sessions.filter(session => session.assistant_turns || session.user_turns);
  const changed = active.filter(session => session.edits + session.writes > 0);
  const investigated = changed.filter(session => session.reads > 0);
  const validated = changed.filter(session => session.test_commands > 0);
  const iterative = active.filter(session => session.user_turns >= 2);
  const tested = active.filter(session => session.test_commands > 0);

  const indicators = {
    investigation_before_change: clamp(ratio(investigated.length, changed.length) * 100),
    validation_during_change: clamp(ratio(validated.length, changed.length) * 100),
    iterative_collaboration: clamp(ratio(iterative.length, active.length) * 100),
    test_execution: clamp(ratio(tested.length, active.length) * 100)
  };
  const confidence = clamp(Math.min(active.length / 12, 1) * 100);

  return {
    assessment_type: "provisional_observed_practice",
    sessions_analysed: active.length,
    confidence,
    indicators,
    interpretation: [
      "This measures observable workflow patterns from local Claude Code history, not engineering ability or employment performance.",
      "It cannot establish code quality, correctness, root-cause reasoning, or business impact without independent evidence from Git, reviews, tests or CI.",
      "Scores must not be used for hiring, promotion, compensation, or ranking people."
    ]
  };
}

export function gradeAiCollaboration(sessions) {
  const totals = sessions.reduce((total, session) => {
    const outcomes = session.edit_outcomes ?? { used_directly: 0, modified: 0, rejected: 0 };
    return {
      used_directly: total.used_directly + outcomes.used_directly,
      modified: total.modified + outcomes.modified,
      rejected: total.rejected + outcomes.rejected
    };
  }, { used_directly: 0, modified: 0, rejected: 0 });
  const editsAnalysed = totals.used_directly + totals.modified + totals.rejected;

  return {
    assessment_type: "approximate_workflow_pattern",
    edits_analysed: editsAnalysed,
    confidence: clamp(Math.min(editsAnalysed / 30, 1) * 100),
    indicators: {
      used_directly: clamp(ratio(totals.used_directly, editsAnalysed) * 100),
      modified: clamp(ratio(totals.modified, editsAnalysed) * 100),
      rejected: clamp(ratio(totals.rejected, editsAnalysed) * 100)
    },
    interpretation: [
      "This approximates what happened after each AI-proposed edit: if the very next tool call is another edit, it's counted as a quick revision (\"modified\"); otherwise a git checkout/reset/restore/revert before the next edit suggests it was undone (\"rejected\"); otherwise it's counted as kept (\"used directly\").",
      "This is a coarse, session-level pattern, not a per-suggestion audit — it cannot see which file was touched, so an edit followed by an unrelated edit elsewhere still counts as \"modified\".",
      "Must not be used for hiring, promotion, compensation, or ranking people."
    ]
  };
}

const INDICATOR_EVIDENCE = {
  investigation_before_change: { competency: "problem_solving", title: "Investigated context before changing code" },
  validation_during_change: { competency: "testing", title: "Validated changes while editing" },
  iterative_collaboration: { competency: "ai_collaboration", title: "Iterated collaboratively across turns" },
  test_execution: { competency: "testing", title: "Ran tests during sessions" }
};

/**
 * Converts observed workflow indicators into evidence events that `evaluateProfile`
 * can score alongside other evidence. Defaults to the lowest "observed" verification
 * weight because activity patterns alone are not a confirmed outcome; callers that
 * have independently corroborated the underlying sessions (e.g. against reviewed,
 * CI-passed pull requests) may pass a stronger `verification` tier.
 */
export function observedPracticeEvents(report, { verification = "observed", idPrefix = "hist" } = {}) {
  const practice = report?.observed_practice;
  if (!practice || practice.sessions_analysed < 1) return [];
  return Object.entries(practice.indicators).flatMap(([key, score]) => {
    const mapping = INDICATOR_EVIDENCE[key];
    if (!mapping) return [];
    return [{
      id: `${idPrefix}_${key}`,
      occurred_at: report.generated_at,
      title: mapping.title,
      summary: `Observed in ${score}% of relevant sessions across ${practice.sessions_analysed} analysed Claude Code sessions.${verification === "observed" ? " Derived from workflow activity, not a verified outcome." : " Time-correlated with a reviewed, CI-passed pull request."}`,
      competency: mapping.competency,
      signal_score: score,
      verification,
      outcome: score >= 50 ? "positive" : "negative"
    }];
  });
}

function summariseSessions(summaries) {
  return summaries.reduce((total, item) => ({
    sessions: total.sessions + 1,
    user_turns: total.user_turns + item.user_turns,
    assistant_turns: total.assistant_turns + item.assistant_turns,
    code_changes: total.code_changes + item.edits + item.writes,
    reads: total.reads + item.reads,
    commands: total.commands + item.commands,
    test_commands: total.test_commands + item.test_commands
  }), { sessions: 0, user_turns: 0, assistant_turns: 0, code_changes: 0, reads: 0, commands: 0, test_commands: 0 });
}

export function createHistoryReport(summaries) {
  return {
    schema_version: "2",
    source: "claude_code_history",
    generated_at: new Date().toISOString(),
    privacy: {
      raw_transcripts_stored: false,
      raw_prompts_stored: false,
      raw_source_code_stored: false,
      raw_commands_stored: false,
      raw_tool_input_or_output_stored: false
    },
    totals: summariseSessions(summaries),
    observed_practice: gradeObservedPractice(summaries),
    ai_collaboration: gradeAiCollaboration(summaries),
    // Minimal per-session data (no file paths, prompts, or commands) kept only so a
    // git/CI integration can time-correlate sessions with reviewed, CI-passed work.
    sessions: summaries.map(({ session_ref, first_activity_at, last_activity_at, user_turns, assistant_turns, reads, edits, writes, test_commands }) =>
      ({ session_ref, first_activity_at, last_activity_at, user_turns, assistant_turns, reads, edits, writes, test_commands }))
  };
}
