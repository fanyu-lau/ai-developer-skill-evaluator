import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildClaudeEvaluationPrompt, parseClaudeEvaluation } from "../src/claude-evaluator.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function runCodex(prompt, outputPath) {
  return new Promise((resolvePromise, reject) => {
    const schemaPath = resolve("schemas/improvement-report.schema.json");
    const child = spawn("codex", ["exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check", "--output-schema", schemaPath, "--output-last-message", outputPath, prompt], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => reject(error.code === "ENOENT" ? new Error("Codex CLI is not installed or is not on your PATH.") : error));
    child.on("close", code => code === 0 ? resolvePromise() : reject(new Error(`Codex CLI evaluation failed: ${stderr.trim() || `exit ${code}`}`)));
  });
}

if (!process.argv.includes("--allow-external-analysis")) {
  process.stderr.write("This sends the derived evaluation report to Codex. Re-run with --allow-external-analysis to confirm.\n");
  process.exit(1);
}

let workDirectory;
try {
  const historyPath = option("--history", "data/claude-history-summary.json");
  const evidencePath = option("--evidence", "data/profile.json");
  const outputPath = option("--output", "data/codex-evaluation.json");
  const [history, evidence] = await Promise.all([
    readFile(historyPath, "utf8").then(JSON.parse),
    readFile(evidencePath, "utf8").then(JSON.parse).catch(() => null)
  ]);
  workDirectory = await mkdtemp(join(tmpdir(), "signal-codex-evaluation-"));
  const modelOutputPath = join(workDirectory, "evaluation.json");
  await runCodex(buildClaudeEvaluationPrompt({ history, evidence }), modelOutputPath);
  const evaluation = parseClaudeEvaluation(await readFile(modelOutputPath, "utf8"));
  const report = {
    schema_version: "1",
    generated_at: new Date().toISOString(),
    generated_by: "codex_cli",
    analysis_scope: "Derived activity metrics and minimised, verified evidence only. No raw transcript, prompt, source code, shell command or path is sent.",
    ...evaluation
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Created Codex improvement report at ${outputPath}.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (workDirectory) await rm(workDirectory, { recursive: true, force: true });
}
