const Z_95 = 1.96;

/**
 * Wilson score interval for a binomial proportion. Used instead of a plain
 * successes/n percentage with an arbitrary sample-size ramp, because a normal
 * approximation misbehaves for small n or proportions near 0/1 — exactly the
 * regime most session/PR counts in this project fall into. Returns null when
 * there's no data to bound (n === 0).
 */
export function wilsonInterval(successes, n, z = Z_95) {
  if (!n) return null;
  const p = successes / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denominator;
  return {
    estimate: Math.round(p * 100),
    low: Math.round(Math.max(0, centre - margin) * 100),
    high: Math.round(Math.min(1, centre + margin) * 100),
    margin: Math.round(margin * 100),
    n
  };
}
