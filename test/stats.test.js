import test from "node:test";
import assert from "node:assert/strict";
import { wilsonInterval } from "../src/stats.js";

test("no data yields no interval", () => {
  assert.equal(wilsonInterval(0, 0), null);
});

test("estimate matches the plain percentage", () => {
  const interval = wilsonInterval(50, 100);
  assert.equal(interval.estimate, 50);
  assert.equal(interval.n, 100);
});

test("interval bounds surround the estimate and stay within 0-100", () => {
  const interval = wilsonInterval(3, 76);
  assert.ok(interval.low >= 0 && interval.low <= interval.estimate);
  assert.ok(interval.high <= 100 && interval.high >= interval.estimate);
});

test("a larger sample size produces a narrower interval for the same proportion", () => {
  const small = wilsonInterval(50, 100);
  const large = wilsonInterval(500, 1000);
  assert.ok(large.margin < small.margin);
});

test("extreme proportions near 0 or 100 stay clamped", () => {
  const zero = wilsonInterval(0, 30);
  const full = wilsonInterval(30, 30);
  assert.equal(zero.low, 0);
  assert.equal(full.high, 100);
});
