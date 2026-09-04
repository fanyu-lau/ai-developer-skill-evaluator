import { createHash, randomBytes } from "node:crypto";
import { wilsonInterval } from "./stats.js";

const TEST_FILE = /(^|\/)(tests?|__tests__|specs?)(\/|$)|[._-](tests?|specs?)\.[a-z0-9]+$|(^|\/)tests?_[^/]+\.[a-z0-9]+$/i;

function hash(value, salt) {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 16);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

/**
 * Reduces a GitHub check/status rollup to a single pass/fail/unknown conclusion.
 *
 * A PR here is already known to be merged, and GitHub's own UI reports checks as
 * "X of Y passed" rather than an all-or-nothing verdict — a single non-blocking job
 * (a coverage report, a preview deploy, a flaky test) can fail without blocking the
 * merge if it isn't a required check. Treating any one failure as sinking the whole
 * PR's CI conclusion overstates how often CI "failed": a real example from this
 * project's own use showed a merged, approved PR with 4 of 5 checks passing —
 * one failing coverage job — that this function used to mark as a flat "FAILURE".
 * So the rule is majority-based instead: FAILURE only when more relevant checks
 * failed than succeeded. This is still a heuristic (not a check for which specific
 * checks are "required" in branch protection, which would need extra API calls and
 * permissions this project doesn't ask for) — just a less blunt one.
 */
function deriveCiConclusion(statusCheckRollup) {
  const relevant = (statusCheckRollup ?? []).filter(check => check.status !== "COMPLETED" || !["SKIPPED", "NEUTRAL", null, undefined].includes(check.conclusion));
  if (relevant.length === 0) return "NONE";
  const failed = relevant.filter(check => ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"].includes(check.conclusion) || check.state === "FAILURE").length;
  const succeeded = relevant.filter(check => check.conclusion === "SUCCESS" || check.state === "SUCCESS").length;
  if (failed === 0) return succeeded ? "SUCCESS" : "NONE";
  return failed > succeeded ? "FAILURE" : "SUCCESS";
}

/**
 * Reduces one `gh pr list --json ...` entry to derived, privacy-safe fields.
 * Deliberately drops the PR title, body, branch names, author, and file paths —
 * only counts, booleans, and timestamps are retained.
 */
export function summarisePullRequest(pr, { installationId = randomBytes(32).toString("hex") } = {}) {
  const files = pr.files ?? [];
  return {
    pr_ref: hash(String(pr.number), installationId),
    merged_at: pr.mergedAt ?? null,
    review_decision: pr.reviewDecision || "NONE",
    ci_conclusion: deriveCiConclusion(pr.statusCheckRollup),
    files_changed: files.length,
    test_files_changed: files.some(file => TEST_FILE.test(file.path ?? "")),
    commit_timestamps: (pr.commits ?? []).map(commit => commit.committedDate).filter(Boolean)
  };
}

export function gradePullRequestPractice(pulls) {
  const approved = pulls.filter(pr => pr.review_decision === "APPROVED");
  const ciPassed = pulls.filter(pr => pr.ci_conclusion === "SUCCESS");
  const testsChanged = pulls.filter(pr => pr.test_files_changed);

  const indicators = {
    review_approval_rate: clamp(ratio(approved.length, pulls.length) * 100),
    ci_pass_rate: clamp(ratio(ciPassed.length, pulls.length) * 100),
    test_coverage_rate: clamp(ratio(testsChanged.length, pulls.length) * 100)
  };
  // Wilson interval per indicator against the analysed-PR count, replacing a single
  // pulls/8 sample-size ramp that was the same number regardless of which indicator.
  const indicator_stats = {
    review_approval_rate: wilsonInterval(approved.length, pulls.length),
    ci_pass_rate: wilsonInterval(ciPassed.length, pulls.length),
    test_coverage_rate: wilsonInterval(testsChanged.length, pulls.length)
  };

  return {
    assessment_type: "verified_delivery_practice",
    pull_requests_analysed: pulls.length,
    indicators,
    indicator_stats,
    interpretation: [
      "This measures merged pull request outcomes (review approval, CI status, test file changes), not code quality or business impact.",
      "It reflects delivery practice, not individual competency, and must not be used for hiring, promotion, compensation, or ranking people.",
      "Each indicator carries a 95% Wilson interval (indicator_stats) based on the number of pull requests analysed — with few PRs, that interval is wide."
    ]
  };
}

const INDICATOR_EVIDENCE = {
  review_approval_rate: { competency: "architecture", title: "Pull requests approved on review" },
  ci_pass_rate: { competency: "implementation", title: "Pull requests passed CI checks" },
  test_coverage_rate: { competency: "testing", title: "Pull requests included test file changes" }
};

/**
 * Converts merged-PR delivery indicators into "corroborated" evidence events — a
 * human reviewer and/or CI genuinely confirmed something, but the signal is an
 * aggregate across pull requests rather than a specific, individually verified item.
 */
export function pullRequestEvents(report) {
  const practice = report?.observed_practice;
  if (!practice || practice.pull_requests_analysed < 1) return [];
  return Object.entries(practice.indicators).flatMap(([key, score]) => {
    const mapping = INDICATOR_EVIDENCE[key];
    if (!mapping) return [];
    return [{
      id: `git_${key}`,
      occurred_at: report.generated_at,
      title: mapping.title,
      summary: `${score}% of ${practice.pull_requests_analysed} analysed merged pull requests. Derived from GitHub review/CI status, not a per-session verified outcome.`,
      competency: mapping.competency,
      signal_score: score,
      verification: "corroborated",
      outcome: score >= 50 ? "positive" : "negative"
    }];
  });
}

export function createGitHistoryReport(pulls) {
  return {
    schema_version: "1",
    source: "github_pull_requests",
    generated_at: new Date().toISOString(),
    privacy: {
      raw_titles_stored: false,
      raw_bodies_stored: false,
      raw_branch_names_stored: false,
      raw_file_paths_stored: false,
      raw_diffs_stored: false,
      raw_commit_messages_stored: false,
      raw_authors_stored: false
    },
    totals: {
      merged_pull_requests: pulls.length,
      approved: pulls.filter(pr => pr.review_decision === "APPROVED").length,
      ci_passed: pulls.filter(pr => pr.ci_conclusion === "SUCCESS").length,
      test_files_touched: pulls.filter(pr => pr.test_files_changed).length
    },
    observed_practice: gradePullRequestPractice(pulls),
    pull_requests: pulls
  };
}
