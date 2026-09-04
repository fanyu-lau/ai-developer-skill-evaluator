const DIMENSIONS = [
  { id: "problem_solving", name: "Problem solving", weight: 0.18, color: "#4a9569", tint: "#e5f3e8" },
  { id: "debugging", name: "Debugging", weight: 0.20, color: "#347c5a", tint: "#e1f1e6" },
  { id: "architecture", name: "Architecture", weight: 0.16, color: "#5a9f86", tint: "#e6f3ed" },
  { id: "implementation", name: "Implementation", weight: 0.16, color: "#83a85a", tint: "#eef4dc" },
  { id: "testing", name: "Testing", weight: 0.15, color: "#d49749", tint: "#f9eedc" },
  { id: "ai_collaboration", name: "AI collaboration", weight: 0.15, color: "#5084a2", tint: "#e2eff5" }
];

const VERIFICATION_WEIGHT = { verified: 1, corroborated: 0.8, observed: 0.55 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value);
}

/**
 * Converts minimised evidence events into traceable, bounded skill scores.
 * An event must include a competency score and a verification status. Raw prompts,
 * source code and terminal history are intentionally outside this contract.
 */
export function evaluateProfile(events, { priorOverall = null } = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("At least one evidence event is required to evaluate a profile.");
  }

  const dimensions = DIMENSIONS.map(dimension => {
    const matches = events.filter(event => event.competency === dimension.id && Number.isFinite(event.signal_score));
    const denominator = matches.reduce((total, event) => total + (VERIFICATION_WEIGHT[event.verification] ?? 0), 0);
    const weightedScore = matches.reduce((total, event) => total + event.signal_score * (VERIFICATION_WEIGHT[event.verification] ?? 0), 0);
    const score = denominator ? round(weightedScore / denominator) : null;
    const confidence = denominator ? round(clamp((denominator / 3) * 100, 0, 100)) : 0;

    return {
      ...dimension,
      score,
      confidence,
      evidence_count: matches.length,
      verified_count: matches.filter(event => event.verification === "verified").length
    };
  });

  const scored = dimensions.filter(dimension => dimension.score !== null);
  const totalWeight = scored.reduce((total, dimension) => total + dimension.weight, 0);
  const overall = round(scored.reduce((total, dimension) => total + dimension.score * dimension.weight, 0) / totalWeight);
  const verifiedOutcomes = events.filter(event => event.verification === "verified" && event.outcome === "positive").length;
  const priorDelta = priorOverall === null ? null : round(overall - priorOverall);

  return {
    methodology_version: "0.1",
    overall,
    prior_delta: priorDelta,
    verified_outcomes: verifiedOutcomes,
    dimensions,
    generated_at: new Date().toISOString()
  };
}

export function createEvidenceTimeline(events, limit = 3) {
  return [...events]
    .filter(event => event.verification !== "observed")
    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
    .slice(0, limit)
    .map(event => ({
      date: new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(event.occurred_at)).toUpperCase(),
      title: event.title,
      competency: DIMENSIONS.find(dimension => dimension.id === event.competency)?.name ?? event.competency,
      detail: event.summary,
      style: event.competency === "testing" ? "test" : event.competency === "architecture" ? "review" : ""
    }));
}
