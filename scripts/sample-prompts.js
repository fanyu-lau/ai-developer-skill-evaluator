import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { extractUserPrompts } from "../src/prompt-sampler.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
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

try {
  const inputDirectory = option("--input-dir");
  const limit = Number(option("--limit", "25"));
  const maxChars = Number(option("--max-chars", "600"));
  const outputPath = option("--output", "data/prompt-sample.json");

  if (!inputDirectory) {
    throw new Error("Usage: node scripts/sample-prompts.js --input-dir <Claude projects directory> [--limit 25] [--max-chars 600] [--output <path>]");
  }

  const transcripts = await findTranscripts(resolve(inputDirectory));
  const withMtime = await Promise.all(transcripts.map(async path => ({ path, mtimeMs: (await stat(path)).mtimeMs })));
  withMtime.sort((a, b) => b.mtimeMs - a.mtimeMs); // newest sessions first, so the sample favours recent prompting behaviour

  const prompts = [];
  for (const { path } of withMtime) {
    if (prompts.length >= limit) break;
    const content = await readFile(path, "utf8");
    const extracted = extractUserPrompts(content, { maxCharsPerPrompt: maxChars });
    prompts.push(...extracted.slice(0, limit - prompts.length));
  }

  const report = {
    schema_version: "1",
    source: "claude_code_prompt_sample",
    generated_at: new Date().toISOString(),
    privacy: {
      stored_locally_only: true,
      sent_externally: false,
      note: "This file contains your own raw prompt text, truncated and capped. Nothing is sent anywhere by this step — it's only sent if you explicitly run evaluate:prompting with --allow-prompt-analysis. Review this file before doing that."
    },
    count: prompts.length,
    prompts
  };

  await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Sampled ${prompts.length} of your own prompts locally to ${resolve(outputPath)}. Nothing was sent anywhere.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
