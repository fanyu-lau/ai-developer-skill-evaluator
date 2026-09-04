import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { buildPromptingFeedbackPrompt } from "../src/prompting-feedback.js";
import { parseClaudeEvaluation } from "../src/claude-evaluator.js";
import { checkGuidelineCompliance } from "../src/coaching-guidelines.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function runClaude(prompt) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("claude", ["-p", prompt, "--output-format", "json"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => reject(error.code === "ENOENT" ? new Error("Claude CLI is not installed or is not on your PATH. Install and sign in to Claude Code first.") : error));
    child.on("close", code => code === 0 ? resolvePromise(stdout) : reject(new Error(`Claude CLI evaluation failed: ${stderr.trim() || `exit ${code}`}`)));
  });
}

// Deliberately a different flag from --allow-external-analysis: every other coaching
// command in this project sends only derived metrics. This one sends your own raw
// prompt text, so it needs its own, more explicit confirmation.
if (!process.argv.includes("--allow-prompt-analysis")) {
  process.stderr.write("This sends your own raw prompt text (not just derived metrics) to Claude CLI for prompting-technique feedback. Re-run with --allow-prompt-analysis to confirm.\n");
  process.exit(1);
}

try {
  const samplePath = option("--sample", "data/prompt-sample.json");
  const outputPath = option("--output", "data/prompting-feedback.json");
  const criteriaFile = option("--criteria-file");
  const criteria = criteriaFile ? await readFile(criteriaFile, "utf8") : option("--criteria");

  const sample = await readFile(samplePath, "utf8").then(JSON.parse).catch(() => null);
  if (!sample?.prompts?.length) {
    throw new Error(`No sampled prompts found at ${samplePath}. Run npm run sample-prompts -- --input-dir ~/.claude/projects first (that step stays local — nothing is sent anywhere until this command).`);
  }

  const prompt = buildPromptingFeedbackPrompt({ prompts: sample.prompts, criteria });
  const cliResult = JSON.parse(await runClaude(prompt));
  const feedback = parseClaudeEvaluation(cliResult.result);
  const guidelineCheck = checkGuidelineCompliance(feedback);

  const report = {
    schema_version: "1",
    generated_at: new Date().toISOString(),
    generated_by: "claude_cli",
    analysis_scope: `Your own ${sample.prompts.length} sampled prompts were sent to Claude CLI to produce this report. Unlike the other coaching commands, this one sends raw text, not just derived metrics.`,
    custom_criteria: criteria ? criteria.trim().slice(0, 500) : null,
    guideline_check: guidelineCheck,
    ...feedback
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!guidelineCheck.passed) {
    process.stderr.write(`Warning: the generated report may violate its own guidelines — see guideline_check in ${outputPath}: ${JSON.stringify(guidelineCheck.violations)}\n`);
  }
  console.log(`Created a prompting-technique feedback report at ${outputPath}.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
