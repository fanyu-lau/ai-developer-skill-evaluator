/**
 * Compares indicators that two independent sources derive for two *related but
 * distinct* testing behaviours — currently: "ran a test command inside a Claude Code
 * session" (from local history) versus "the merged PR touched a test file" (from
 * GitHub). These are NOT the same construct: running an existing test and writing or
 * changing test code are different actions, and a developer could do either without
 * the other (e.g. run tests locally without committing new test code, or add a test
 * file that only ever runs in CI). So this is not a convergent-validity check of one
 * "testing practice" — it's an honest juxtaposition of two adjacent, imperfect
 * proxies, and a gap between them is expected to some degree even if both are
 * working as intended. Neither indicator is validated on its own; disagreement does
 * not prove either one wrong, and agreement would not prove either one right either.
 */
export function compareObservedSignals(history, gitHistory) {
  const claude = history?.observed_practice;
  const git = gitHistory?.observed_practice;
  if (!claude?.indicators || !git?.indicators) return null;

  const pairs = [
    {
      construct: "Testing signals (related, not identical, behaviours)",
      claude_signal: {
        label: "Ran a test command during the Claude Code session",
        value: claude.indicators.test_execution,
        stats: claude.indicator_stats?.test_execution ?? null,
        n: claude.sessions_analysed,
        source: "Claude Code session history"
      },
      git_signal: {
        label: "Merged pull request touched a test file",
        value: git.indicators.test_coverage_rate,
        stats: git.indicator_stats?.test_coverage_rate ?? null,
        n: git.pull_requests_analysed,
        source: "GitHub pull requests"
      }
    }
  ];

  return pairs.map(pair => {
    const delta = Math.abs(pair.claude_signal.value - pair.git_signal.value);
    return {
      ...pair,
      delta,
      note: `These two signals differ by ${delta} percentage points. They measure related but different actions — running a test command versus changing a test file — so some gap is expected even if both are accurate. A gap this size could reflect that difference, or that one signal is missing real activity it can't see (tests run outside the observed channel, or test files touched without a local test run). Neither number should be read as a precise measure of "testing practice" on its own.`
    };
  });
}
