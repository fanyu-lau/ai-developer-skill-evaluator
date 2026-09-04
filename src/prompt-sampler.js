const INJECTED_TAG = /<(ide_opened_file|ide_selection|system-reminder|ide_diagnostics)>[\s\S]*?<\/\1>/g;
const SYSTEM_MARKER = /^\[Request interrupted by user\]$/i;
const MIN_AUTHORED_CHARS = 5;

/**
 * Extracts the developer's own typed prompt text from one Claude Code JSONL
 * transcript. Synthetic "user" turns injected after tool execution (which carry
 * tool_result content blocks, not authored text) are skipped, since only an actual
 * typed prompt is useful for prompting-technique feedback. IDE-injected context tags
 * (e.g. "the user opened file X") are stripped before judging whether an entry has
 * any authored content, since those are the editor's doing, not the developer's
 * prompting. Each prompt is truncated to maxCharsPerPrompt so a single long paste
 * can't dominate a sample.
 */
export function extractUserPrompts(lines, { maxCharsPerPrompt = 600 } = {}) {
  const prompts = [];
  for (const line of lines.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== "user") continue;
    const content = entry.message?.content;
    let text = null;
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const textBlock = content.find(item => item.type === "text" && typeof item.text === "string");
      if (textBlock) text = textBlock.text;
    }
    if (typeof text !== "string") continue;
    const authored = text.replace(INJECTED_TAG, "").trim();
    if (authored.length < MIN_AUTHORED_CHARS || SYSTEM_MARKER.test(authored)) continue;
    prompts.push({
      occurred_at: typeof entry.timestamp === "string" ? entry.timestamp : null,
      text: authored.slice(0, maxCharsPerPrompt)
    });
  }
  return prompts;
}
