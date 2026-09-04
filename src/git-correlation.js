// 96 hours (4 days) — a rough stand-in for "a typical code-review-to-merge
// turnaround, generously covering a weekend," not a validated figure. It was
// widened from an initial 72-hour guess for the same reason: both are heuristics
// picked by hand, not derived from data, and should be described as such rather
// than defended as if either number were proven correct. Override with
// `--correlation-window-hours` on `npm run evaluate` if you want to test a
// different value against your own history.
const DEFAULT_WINDOW_HOURS = 96;

/**
 * Splits Claude Code sessions into those temporally close to a reviewed, CI-passed
 * merged pull request versus the rest. Correlation is time-window only — this
 * codebase never retains per-session file paths, so a session can't be tied to a
 * specific PR by content, only by "a verified merge landed around when this
 * session happened". That's why the caller (scripts/evaluate.js) treats a match as
 * a time correlation and not proof — it promotes matched sessions to "verified"
 * evidence, but caps them at verified's weight rather than treating the link as
 * certain, precisely because it's plausible, not confirmed.
 */
export function correlateSessionsWithPullRequests(sessions, pulls, { windowHours = DEFAULT_WINDOW_HOURS } = {}) {
  const windowMs = windowHours * 60 * 60 * 1000;
  const verifiedCommitTimes = (pulls ?? [])
    .filter(pr => pr.review_decision === "APPROVED" && pr.ci_conclusion === "SUCCESS")
    .flatMap(pr => pr.commit_timestamps ?? [])
    .map(timestamp => new Date(timestamp).getTime())
    .filter(Number.isFinite);

  const matched = [];
  const unmatched = [];
  for (const session of sessions ?? []) {
    const start = new Date(session.first_activity_at).getTime();
    const end = new Date(session.last_activity_at).getTime();
    const isMatch = Number.isFinite(start) && Number.isFinite(end) &&
      verifiedCommitTimes.some(commitTime => commitTime >= start - windowMs && commitTime <= end + windowMs);
    (isMatch ? matched : unmatched).push(session);
  }
  return { matched, unmatched };
}
