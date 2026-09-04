import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createHistoryReport, summariseClaudeTranscript } from "../src/claude-history.js";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

async function findTranscripts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTranscripts(path);
    return entry.isFile() && entry.name.endsWith(".jsonl") ? [path] : [];
  }));
  return nested.flat();
}

const inputDirectory = option("--input-dir");
const outputFile = option("--output") ?? "data/claude-history-summary.json";
if (!inputDirectory) {
  process.stderr.write("Usage: node scripts/import-claude-history.js --input-dir <Claude projects directory> [--output <report path>]\n");
  process.exit(1);
}

const transcripts = await findTranscripts(resolve(inputDirectory));
const installationId = randomBytes(32).toString("hex");
const summaries = [];
for (const transcript of transcripts) {
  const summary = summariseClaudeTranscript(await readFile(transcript, "utf8"), { installationId });
  if (summary) summaries.push(summary);
}

const report = createHistoryReport(summaries);
await writeFile(resolve(outputFile), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Created a private, derived report from ${report.totals.sessions} Claude Code sessions at ${resolve(outputFile)}.`);
