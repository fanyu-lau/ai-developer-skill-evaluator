#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { minimiseClaudeHook } from "../src/claude-collector.js";

const [command] = process.argv.slice(2);

async function readInstallationId(dataDir) {
  const path = join(dataDir, "installation-id");
  try {
    return (await readFile(path, "utf8")).trim();
  } catch {
    const id = randomBytes(32).toString("hex");
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, `${id}\n`, { mode: 0o600 });
    return id;
  }
}

async function collectClaudeHook() {
  // A collector must never interfere with the developer's Claude Code session.
  try {
    const raw = await new Promise((resolve, reject) => {
      let body = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", chunk => { body += chunk; });
      process.stdin.on("end", () => resolve(body));
      process.stdin.on("error", reject);
    });
    const input = JSON.parse(raw);
    const dataDir = join(process.cwd(), ".pawskill");
    const installationId = await readInstallationId(dataDir);
    const event = minimiseClaudeHook(input, { installationId });
    if (event) await appendFile(join(dataDir, "claude-events.jsonl"), `${JSON.stringify(event)}\n`, { mode: 0o600 });
  } catch (error) {
    // Keep the error local; a data-collection failure must not alter Claude's work.
    process.stderr.write(`PawSkill collector skipped event: ${error.message}\n`);
  }
}

if (command === "claude-hook") {
  await collectClaudeHook();
} else {
  process.stderr.write("Usage: pawskill claude-hook\n");
  process.exitCode = 1;
}
