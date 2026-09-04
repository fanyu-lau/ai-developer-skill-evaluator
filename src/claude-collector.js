import { createHash, randomBytes } from "node:crypto";

const SUPPORTED_EVENTS = new Set(["SessionStart", "PostToolUse", "PostToolUseFailure", "Stop"]);

function hash(value, salt) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 24);
}

/**
 * Reduces Claude Code hook input to local, pseudonymous activity metadata.
 * This intentionally never returns prompt text, transcript paths, cwd values,
 * tool inputs, tool outputs, source code, shell commands or environment data.
 */
export function minimiseClaudeHook(input, { installationId, now = new Date() } = {}) {
  if (!input || typeof input !== "object" || !SUPPORTED_EVENTS.has(input.hook_event_name)) {
    return null;
  }
  if (!installationId || typeof installationId !== "string") {
    throw new Error("An installation identifier is required for Claude Code collection.");
  }

  const hookEvent = input.hook_event_name;
  const status = hookEvent === "PostToolUseFailure" ? "failed" : "completed";
  const activity = hookEvent === "SessionStart" ? "session_started"
    : hookEvent === "Stop" ? "session_ended"
      : `tool_${status}`;

  return {
    schema_version: "1",
    id: randomBytes(12).toString("hex"),
    captured_at: now.toISOString(),
    source: "claude_code",
    activity,
    status,
    session_ref: typeof input.session_id === "string" ? hash(input.session_id, installationId) : null,
    project_ref: typeof input.cwd === "string" ? hash(input.cwd, installationId) : null,
    tool: typeof input.tool_name === "string" ? input.tool_name : null
  };
}

export function summariseClaudeActivity(events) {
  const claudeEvents = events.filter(event => event.source === "claude_code");
  const sessions = new Set(claudeEvents.map(event => event.session_ref).filter(Boolean));
  const byTool = Object.groupBy(claudeEvents.filter(event => event.tool), event => event.tool);

  return {
    sessions: sessions.size,
    tool_activities: claudeEvents.filter(event => event.activity.startsWith("tool_")).length,
    failed_activities: claudeEvents.filter(event => event.status === "failed").length,
    tools_used: Object.fromEntries(Object.entries(byTool).map(([tool, values]) => [tool, values.length])),
    scoring_note: "Activity metadata is not treated as evidence of skill. It can only be correlated with verified outcomes from Git or CI."
  };
}
