import test from "node:test";
import assert from "node:assert/strict";
import { compareObservedSignals } from "../src/measurement-check.js";

const history = {
  observed_practice: {
    sessions_analysed: 76,
    indicators: { test_execution: 3 },
    indicator_stats: { test_execution: { estimate: 3, low: 0, high: 11, margin: 5, n: 76 } }
  }
};
const gitHistory = {
  observed_practice: {
    pull_requests_analysed: 100,
    indicators: { test_coverage_rate: 5 },
    indicator_stats: { test_coverage_rate: { estimate: 5, low: 2, high: 11, margin: 4, n: 100 } }
  }
};

test("missing either source yields no comparison", () => {
  assert.equal(compareObservedSignals(null, gitHistory), null);
  assert.equal(compareObservedSignals(history, null), null);
  assert.equal(compareObservedSignals({}, gitHistory), null);
});

test("compares related but distinct signals from two independent sources", () => {
  const [pair] = compareObservedSignals(history, gitHistory);
  assert.match(pair.construct, /related, not identical/);
  assert.equal(pair.claude_signal.value, 3);
  assert.equal(pair.claude_signal.source, "Claude Code session history");
  assert.equal(pair.git_signal.value, 5);
  assert.equal(pair.git_signal.source, "GitHub pull requests");
  assert.equal(pair.delta, 2);
  assert.match(pair.note, /differ by 2 percentage points/);
});

test("does not claim agreement proves either signal is accurate, or that they measure the same thing", () => {
  const [pair] = compareObservedSignals(history, gitHistory);
  assert.match(pair.note, /related but different actions/);
  assert.match(pair.note, /Neither number should be read as a precise measure/);
});
