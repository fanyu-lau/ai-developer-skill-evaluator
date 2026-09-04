const DEFAULT_WINDOW_HOURS = 72;

/**
 * Splits Claude Code sessions into those temporally close to a reviewed, CI-passed
 * merged pull request versus the rest. Correlation is time-window only — this
 * codebase never retains per-session file paths, so a session can't be tied to a
 * specific PR by content, only by "a verified merge landed around when this
 * session happened". That's why matched sessions become "corroborated" rather
 * than "verified" evidence in the caller (see evaluateProfile's verification
 * weights) — it's a plausible link, not a confirmed one.
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
