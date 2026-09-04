import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { buildClaudeEvaluationPrompt, parseClaudeEvaluation } from "../src/claude-evaluator.js";
import { checkGuidelineCompliance } from "../src/coaching-guidelines.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", prompt, "--output-format", "json"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => reject(error.code === "ENOENT" ? new Error("Claude CLI is not installed or is not on your PATH. Install and sign in to Claude Code first.") : error));
    child.on("close", code => code === 0 ? resolve(stdout) : reject(new Error(`Claude CLI evaluation failed: ${stderr.trim() || `exit ${code}`}`)));
  });
}

if (!process.argv.includes("--allow-external-analysis")) {
  process.stderr.write("This sends the derived evaluation report to Claude through the Claude CLI. Re-run with --allow-external-analysis to confirm.\n");
  process.exit(1);
}

try {
  const historyPath = option("--history", "data/claude-history-summary.json");
  const evidencePath = option("--evidence", "data/profile.json");
  const outputPath = option("--output", "data/claude-evaluation.json");
  const [history, evidence] = await Promise.all([
    readFile(historyPath, "utf8").then(JSON.parse),
    readFile(evidencePath, "utf8").then(JSON.parse).catch(() => null)
  ]);
  const cliResult = JSON.parse(await runClaude(buildClaudeEvaluationPrompt({ history, evidence })));
  const evaluation = parseClaudeEvaluation(cliResult.result);
  const guidelineCheck = checkGuidelineCompliance(evaluation);
  const report = {
    schema_version: "1",
    generated_at: new Date().toISOString(),
    generated_by: "claude_cli",
    analysis_scope: "Derived activity metrics and minimised, verified evidence only. No raw transcript, prompt, source code, shell command or path is sent.",
    guideline_check: guidelineCheck,
    ...evaluation
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  if (!guidelineCheck.passed) {
    process.stderr.write(`Warning: the generated report may violate its own guidelines — see guideline_check in ${outputPath}: ${JSON.stringify(guidelineCheck.violations)}\n`);
  }
  console.log(`Created Claude improvement report at ${outputPath}.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
