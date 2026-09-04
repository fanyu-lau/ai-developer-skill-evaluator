import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { summarisePullRequest, createGitHistoryReport } from "../src/git-history.js";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function optionAll(name) {
  const values = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === name && process.argv[i + 1]) values.push(process.argv[i + 1]);
  }
  return values;
}

function runGh(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("gh", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => reject(error.code === "ENOENT" ? new Error("GitHub CLI (gh) is not installed or not on your PATH. Install it and run `gh auth login` first.") : error));
    child.on("close", code => code === 0 ? resolvePromise(stdout) : reject(new Error(`gh CLI failed: ${stderr.trim() || `exit ${code}`}`)));
  });
}

// Runs `fn` over `items` with at most `concurrency` gh CLI calls in flight at once,
// so a large --author search doesn't fire hundreds of simultaneous requests.
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const PR_DETAIL_FIELDS = "number,mergedAt,reviewDecision,statusCheckRollup,files,commits";

try {
  const limit = option("--limit", "100");
  const repo = option("--repo");
  const author = option("--author");
  const owners = optionAll("--owner");
  const outputPath = option("--output", "data/git-history-summary.json");

  let pulls;
  if (author) {
    // gh's search API only returns basic fields (no review/CI/files), so first find
    // which PRs are yours across every repo you can see, then fetch each one's detail.
    const searchArgs = ["search", "prs", "--author", author, "--merged", "--limit", limit, "--json", "repository,number"];
    for (const owner of owners) searchArgs.push("--owner", owner);
    const matches = JSON.parse(await runGh(searchArgs));
    process.stderr.write(`Found ${matches.length} merged pull requests by ${author}. Fetching details...\n`);
    pulls = await mapWithConcurrency(matches, 5, match =>
      runGh(["pr", "view", String(match.number), "--repo", match.repository.nameWithOwner, "--json", PR_DETAIL_FIELDS]).then(JSON.parse));
  } else {
    const args = ["pr", "list", "--state", "merged", "--limit", limit, "--json", PR_DETAIL_FIELDS];
    if (repo) args.push("--repo", repo);
    pulls = JSON.parse(await runGh(args));
  }

  const installationId = randomBytes(32).toString("hex");
  const summarised = pulls.map(pr => summarisePullRequest(pr, { installationId }));
  const report = createGitHistoryReport(summarised);

  await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Created a private, derived report from ${report.totals.merged_pull_requests} merged pull requests at ${resolve(outputPath)}.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
