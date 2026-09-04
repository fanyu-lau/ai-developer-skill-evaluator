import { createHash, randomBytes } from "node:crypto";

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

/** Reduces a GitHub check/status rollup to a single pass/fail/unknown conclusion. */
function deriveCiConclusion(statusCheckRollup) {
  const relevant = (statusCheckRollup ?? []).filter(check => check.status !== "COMPLETED" || !["SKIPPED", "NEUTRAL", null, undefined].includes(check.conclusion));
  if (relevant.length === 0) return "NONE";
  const failed = relevant.some(check => ["FAILURE", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"].includes(check.conclusion) || check.state === "FAILURE");
  if (failed) return "FAILURE";
  const succeeded = relevant.some(check => check.conclusion === "SUCCESS" || check.state === "SUCCESS");
  return succeeded ? "SUCCESS" : "NONE";
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
  const confidence = clamp(Math.min(pulls.length / 8, 1) * 100);

  return {
    assessment_type: "verified_delivery_practice",
    pull_requests_analysed: pulls.length,
    confidence,
    indicators,
    interpretation: [
      "This measures merged pull request outcomes (review approval, CI status, test file changes), not code quality or business impact.",
      "It reflects delivery practice, not individual competency, and must not be used for hiring, promotion, compensation, or ranking people."
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
