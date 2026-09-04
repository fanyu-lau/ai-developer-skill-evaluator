import test from "node:test";
import assert from "node:assert/strict";
import { createGitHistoryReport, gradePullRequestPractice, pullRequestEvents, summarisePullRequest } from "../src/git-history.js";

const rawPr = {
  number: 42,
  mergedAt: "2026-08-10T12:00:00Z",
  reviewDecision: "APPROVED",
  statusCheckRollup: [
    { status: "COMPLETED", conclusion: "SKIPPED" },
    { status: "COMPLETED", conclusion: "SUCCESS" }
  ],
  files: [{ path: "src/widget.js", additions: 10, deletions: 2 }, { path: "test/widget.test.js", additions: 20, deletions: 0 }],
  commits: [{ committedDate: "2026-08-10T11:00:00Z", messageHeadline: "secret internal codename", authoredDate: "2026-08-10T10:59:00Z" }]
};

test("PR summary keeps only derived fields, no title/body/author/paths", () => {
  const summary = summarisePullRequest(rawPr, { installationId: "local-salt" });
  assert.deepEqual(Object.keys(summary).sort(), ["ci_conclusion", "commit_timestamps", "files_changed", "merged_at", "pr_ref", "review_decision", "test_files_changed"].sort());
  assert.equal(summary.ci_conclusion, "SUCCESS");
  assert.equal(summary.test_files_changed, true);
  assert.equal(summary.files_changed, 2);
  assert.deepEqual(summary.commit_timestamps, ["2026-08-10T11:00:00Z"]);
  assert.equal(JSON.stringify(summary).match(/secret|widget\.js/), null);
});

test("a single failing check does not override an equal or greater number of passing checks", () => {
  const summary = summarisePullRequest({ ...rawPr, statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }, { status: "COMPLETED", conclusion: "FAILURE" }] }, { installationId: "s" });
  assert.equal(summary.ci_conclusion, "SUCCESS");
});

test("a majority of failing checks does override the passing ones", () => {
  const summary = summarisePullRequest({ ...rawPr, statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }, { status: "COMPLETED", conclusion: "FAILURE" }, { status: "COMPLETED", conclusion: "FAILURE" }] }, { installationId: "s" });
  assert.equal(summary.ci_conclusion, "FAILURE");
});

test("regression: a merged PR with 4 of 5 checks passing (one failing coverage job) reads as SUCCESS, not FAILURE", () => {
  // This is the exact real-world shape that motivated the fix: GitHub's own UI
  // reported "4 of 5 checks passed" and merged the PR, but the old any-failure-wins
  // rule collapsed it to a flat "FAILURE".
  const rollup = [
    { status: "COMPLETED", conclusion: "SUCCESS" },
    { status: "COMPLETED", conclusion: "SUCCESS" },
    { status: "COMPLETED", conclusion: "SUCCESS" },
    { status: "COMPLETED", conclusion: "SUCCESS" },
    { status: "COMPLETED", conclusion: "FAILURE" }
  ];
  const summary = summarisePullRequest({ ...rawPr, statusCheckRollup: rollup }, { installationId: "s" });
  assert.equal(summary.ci_conclusion, "SUCCESS");
});

test("no relevant checks yields NONE, not SUCCESS", () => {
  const summary = summarisePullRequest({ ...rawPr, statusCheckRollup: [{ status: "COMPLETED", conclusion: "SKIPPED" }] }, { installationId: "s" });
  assert.equal(summary.ci_conclusion, "NONE");
});

test("recognises non-JS test file naming conventions", () => {
  const goStyle = summarisePullRequest({ ...rawPr, files: [{ path: "git/client_test.go" }] }, { installationId: "s" });
  const pythonPrefixStyle = summarisePullRequest({ ...rawPr, files: [{ path: "tests/test_widget.py" }] }, { installationId: "s" });
  const pythonSuffixStyle = summarisePullRequest({ ...rawPr, files: [{ path: "widget_test.py" }] }, { installationId: "s" });
  const nonTestFile = summarisePullRequest({ ...rawPr, files: [{ path: "src/contest.js" }] }, { installationId: "s" });
  assert.equal(goStyle.test_files_changed, true);
  assert.equal(pythonPrefixStyle.test_files_changed, true);
  assert.equal(pythonSuffixStyle.test_files_changed, true);
  assert.equal(nonTestFile.test_files_changed, false);
});

test("grades review approval, CI pass, and test coverage rates", () => {
  const pulls = [
    { review_decision: "APPROVED", ci_conclusion: "SUCCESS", test_files_changed: true },
    { review_decision: "CHANGES_REQUESTED", ci_conclusion: "FAILURE", test_files_changed: false }
  ];
  const practice = gradePullRequestPractice(pulls);
  assert.equal(practice.indicators.review_approval_rate, 50);
  assert.equal(practice.indicators.ci_pass_rate, 50);
  assert.equal(practice.indicators.test_coverage_rate, 50);
});

test("pull request events are corroborated, not verified or observed", () => {
  const report = createGitHistoryReport([
    { review_decision: "APPROVED", ci_conclusion: "SUCCESS", test_files_changed: true, files_changed: 2, merged_at: "2026-08-10T12:00:00Z", commit_timestamps: [] }
  ]);
  const events = pullRequestEvents(report);
  assert.equal(events.length, 3);
  assert.ok(events.every(event => event.verification === "corroborated"));
  assert.deepEqual(new Set(events.map(event => event.competency)), new Set(["architecture", "implementation", "testing"]));
});

test("no pull requests yields no events", () => {
  assert.deepEqual(pullRequestEvents(createGitHistoryReport([])), []);
});
