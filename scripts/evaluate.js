import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { evaluateProfile, createEvidenceTimeline } from "../src/evaluator.js";
import { buildArchetypeProfile } from "../src/archetypes.js";
import { observedPracticeEvents, gradeObservedPractice } from "../src/claude-history.js";
import { pullRequestEvents } from "../src/git-history.js";
import { correlateSessionsWithPullRequests } from "../src/git-correlation.js";
import { compareObservedSignals } from "../src/measurement-check.js";

const execFileAsync = promisify(execFile);

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function gitUserName() {
  try {
    const { stdout } = await execFileAsync("git", ["config", "user.name"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function initialsOf(name) {
  return name.split(/\s+/).filter(Boolean).map(word => word[0]).join("").slice(0, 2).toUpperCase();
}

// Below this many classified edits, the used/modified/rejected split is too thin to
// show without it reading as more confident than a handful of data points warrants.
const AI_COLLABORATION_MIN_EDITS = 5;

try {
  const historyPath = new URL("../data/claude-history-summary.json", import.meta.url);
  const gitHistoryPath = new URL("../data/git-history-summary.json", import.meta.url);
  const outputPath = new URL("../data/profile.json", import.meta.url);
  const curatedEventsPath = option("--events");

  const history = await readFile(historyPath, "utf8").then(JSON.parse).catch(() => null);
  const gitHistory = await readFile(gitHistoryPath, "utf8").then(JSON.parse).catch(() => null);
  const previousProfile = await readFile(outputPath, "utf8").then(JSON.parse).catch(() => null);
  const curated = curatedEventsPath ? JSON.parse(await readFile(curatedEventsPath, "utf8")) : null;

  // Claude activity alone only ever earns the lowest "observed" verification weight.
  // If a git/CI import is also present, sessions that fall within a time window of a
  // reviewed, CI-passed merged pull request are re-graded separately and promoted to
  // "verified" — the one link from raw activity to a confirmed outcome this pipeline
  // can make. Everything else stays "observed".
  const correlationWindowHoursOption = option("--correlation-window-hours");
  const correlationWindowHours = correlationWindowHoursOption ? Number(correlationWindowHoursOption) : undefined;

  let historyEvents = [];
  let correlatedSessions = 0;
  let correlationWindowUsed = null;
  if (history?.sessions?.length && gitHistory?.pull_requests?.length) {
    const { matched, unmatched } = correlateSessionsWithPullRequests(history.sessions, gitHistory.pull_requests, correlationWindowHours ? { windowHours: correlationWindowHours } : {});
    correlationWindowUsed = correlationWindowHours ?? 96; // keep in sync with DEFAULT_WINDOW_HOURS in src/git-correlation.js
    correlatedSessions = matched.length;
    if (matched.length) historyEvents.push(...observedPracticeEvents({ ...history, observed_practice: gradeObservedPractice(matched) }, { verification: "verified", idPrefix: "hist_verified" }));
    if (unmatched.length) historyEvents.push(...observedPracticeEvents({ ...history, observed_practice: gradeObservedPractice(unmatched) }, { idPrefix: "hist_observed" }));
  } else if (history) {
    // No per-session data (older import) or no git history to correlate against — fall
    // back to plain aggregate indicators, all at the "observed" verification weight.
    historyEvents = observedPracticeEvents(history);
  }
  const gitEvents = gitHistory ? pullRequestEvents(gitHistory) : [];
  const curatedEvents = curated?.events ?? [];
  const events = [...curatedEvents, ...historyEvents, ...gitEvents];

  if (events.length === 0) {
    throw new Error("No evidence to evaluate. Run npm run import:claude-history and/or npm run import:git-history first, or pass --events <path> to a curated evidence file.");
  }

  const evaluation = evaluateProfile(events, { priorOverall: previousProfile?.overall ?? null });
  const name = await gitUserName();

  const aiPractice = history?.ai_collaboration;
  const aiCollaboration = aiPractice?.edits_analysed >= AI_COLLABORATION_MIN_EDITS
    ? { ...aiPractice.indicators, edits_analysed: aiPractice.edits_analysed }
    : null;

  const profile = {
    developer: name ? { name, initials: initialsOf(name) } : null,
    period: "All imported history",
    ...evaluation,
    timeline: createEvidenceTimeline(events, Infinity),
    archetypes: buildArchetypeProfile(evaluation.dimensions),
    ai_collaboration: aiCollaboration,
    measurement_check: compareObservedSignals(history, gitHistory),
    sources: [curatedEvents.length && "Curated evidence", history && "Claude Code", gitHistory && "GitHub"].filter(Boolean)
  };

  await writeFile(outputPath, `${JSON.stringify(profile, null, 2)}\n`);

  const parts = [];
  if (curatedEvents.length) parts.push(`${curatedEvents.length} curated evidence events`);
  if (historyEvents.length) parts.push(`${historyEvents.length} Claude history signals${correlatedSessions ? ` (${correlatedSessions} sessions promoted to verified, within ${correlationWindowUsed}h of an approved+CI-passed merge)` : ""}`);
  if (gitEvents.length) parts.push(`${gitEvents.length} pull request signals`);
  console.log(`Generated ${outputPath.pathname} — overall score ${profile.overall}/100 from ${parts.join(", ")}.`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
