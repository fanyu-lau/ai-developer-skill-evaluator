const ARCHETYPES = [
  {
    id: "owl", animal: "Owl", title: "The Investigator", icon: "🦉", color: "#4f7a61",
    description: "Observant and methodical. Owls gather context, compare signals and resist the first plausible answer.",
    signals: { problem_solving: 0.36, debugging: 0.38, ai_collaboration: 0.26 },
    strengths: "Turns uncertainty into testable hypotheses.",
    very_compatible: ["fox", "badger"], compatible: ["ant", "raven"]
  },
  {
    id: "fox", animal: "Fox", title: "The Strategist", icon: "🦊", color: "#c17452",
    description: "Resourceful and deliberate. Foxes frame ambiguity, see options early and choose a path with intent.",
    signals: { problem_solving: 0.42, architecture: 0.35, ai_collaboration: 0.23 },
    strengths: "Creates clarity before momentum.",
    very_compatible: ["owl", "spider"], compatible: ["hawk", "chameleon"]
  },
  {
    id: "beaver", animal: "Beaver", title: "The Builder", icon: "🦫", color: "#9a744d",
    description: "Steady and practical. Beavers turn a useful plan into working, maintainable increments.",
    signals: { implementation: 0.65, testing: 0.2, ai_collaboration: 0.15 },
    strengths: "Builds reliable progress one piece at a time.",
    very_compatible: ["ant", "hawk"], compatible: ["dolphin", "elephant"]
  },
  {
    id: "ant", animal: "Ant", title: "The Validator", icon: "🐜", color: "#b17b48",
    description: "Careful and dependable. Ants notice edge cases, verify assumptions and help make quality repeatable.",
    signals: { testing: 0.62, implementation: 0.22, debugging: 0.16 },
    strengths: "Makes confidence measurable through validation.",
    very_compatible: ["beaver", "elephant"], compatible: ["owl", "badger"]
  },
  {
    id: "octopus", animal: "Octopus", title: "The Systems Thinker", icon: "🐙", color: "#836b9f",
    description: "Curious across connections. Octopuses see dependencies, interfaces and the moving parts around a change.",
    signals: { architecture: 0.62, problem_solving: 0.23, implementation: 0.15 },
    strengths: "Connects local decisions to whole-system effects.",
    very_compatible: ["spider", "chameleon"], compatible: ["fox", "elephant"]
  },
  {
    id: "badger", animal: "Badger", title: "The Resilient Debugger", icon: "🦡", color: "#697068",
    description: "Persistent and grounded. Badgers stay with difficult failures until the evidence points to a real fix.",
    signals: { debugging: 0.66, problem_solving: 0.2, testing: 0.14 },
    strengths: "Stays calm and useful when systems get messy.",
    very_compatible: ["owl", "ant"], compatible: ["hawk", "raven"]
  },
  {
    id: "hawk", animal: "Hawk", title: "The Focused Operator", icon: "🦅", color: "#8a6a43",
    description: "Clear-eyed and decisive. Hawks identify the highest-value next move and finish what matters.",
    signals: { implementation: 0.48, problem_solving: 0.26, ai_collaboration: 0.26 },
    strengths: "Converts priorities into momentum.",
    very_compatible: ["beaver", "dolphin"], compatible: ["fox", "badger"]
  },
  {
    id: "dolphin", animal: "Dolphin", title: "The Collaborator", icon: "🐬", color: "#4d92a8",
    description: "Generous and communicative. Dolphins make ideas easier to share, review and improve together.",
    signals: { ai_collaboration: 0.58, implementation: 0.2, problem_solving: 0.22 },
    strengths: "Makes good work easier for others to build on.",
    very_compatible: ["hawk", "elephant"], compatible: ["beaver", "chameleon"]
  },
  {
    id: "spider", animal: "Spider", title: "The Architect", icon: "🕷️", color: "#5d697e",
    description: "Structured and patient. Spiders design strong foundations and make complexity easier to navigate.",
    signals: { architecture: 0.7, implementation: 0.18, problem_solving: 0.12 },
    strengths: "Designs patterns that hold as a system grows.",
    very_compatible: ["octopus", "fox"], compatible: ["owl", "elephant"]
  },
  {
    id: "chameleon", animal: "Chameleon", title: "The Adapter", icon: "🦎", color: "#579978",
    description: "Flexible and quick to learn. Chameleons adapt tools and approaches to fit the real context.",
    signals: { ai_collaboration: 0.46, problem_solving: 0.31, architecture: 0.23 },
    strengths: "Finds a useful approach when the context changes.",
    very_compatible: ["octopus", "raven"], compatible: ["fox", "dolphin"]
  },
  {
    id: "elephant", animal: "Elephant", title: "The Steward", icon: "🐘", color: "#6f8290",
    description: "Thoughtful and protective. Elephants consider reliability, maintenance and the people affected by change.",
    signals: { testing: 0.34, architecture: 0.35, implementation: 0.31 },
    strengths: "Protects long-term trust in the system.",
    very_compatible: ["ant", "dolphin"], compatible: ["spider", "octopus"]
  },
  {
    id: "raven", animal: "Raven", title: "The Challenger", icon: "🐦‍⬛", color: "#454c60",
    description: "Independent and discerning. Ravens question defaults, test AI output and surface the overlooked risk.",
    signals: { ai_collaboration: 0.55, debugging: 0.26, problem_solving: 0.19 },
    strengths: "Improves decisions by asking the question others skip.",
    very_compatible: ["chameleon", "owl"], compatible: ["badger", "fox"]
  }
];

function level(score) {
  if (score >= 88) return "Master";
  if (score >= 72) return "Senior";
  return "Junior";
}

const TIER_APPEARANCE = {
  Junior: {
    label: "Explorer",
    mark: "✦",
    description: "Building the habit and learning where to look next.",
    visual: "A fresh field journal and a small discovery sparkle."
  },
  Senior: {
    label: "Practitioner",
    mark: "◆",
    description: "Showing a repeatable practice across real engineering work.",
    visual: "A practical compass badge that signals reliable craft."
  },
  Master: {
    label: "Guide",
    mark: "✺",
    description: "Demonstrating broad, consistent practice in complex contexts.",
    visual: "A radiant laurel crest that signals a mature, evidence-backed practice."
  }
};

export function buildArchetypeProfile(dimensions) {
  const scores = Object.fromEntries(dimensions.map(item => [item.id, item.score ?? 0]));
  const ranked = ARCHETYPES.map(archetype => ({
    ...archetype,
    score: Math.round(Object.entries(archetype.signals).reduce((total, [dimension, weight]) => total + (scores[dimension] ?? 0) * weight, 0))
  })).sort((a, b) => b.score - a.score);
  const primaryLevel = level(ranked[0].score);
  const secondaryLevel = level(ranked[1].score);
  const primary = { ...ranked[0], level: primaryLevel, avatar: TIER_APPEARANCE[primaryLevel] };
  const secondary = { ...ranked[1], level: secondaryLevel, avatar: TIER_APPEARANCE[secondaryLevel] };
  const lookup = Object.fromEntries(ARCHETYPES.map(archetype => [archetype.id, archetype]));
  return {
    framing: "These are evidence-informed engineering work-style archetypes, not fixed personality labels or performance ratings.",
    primary,
    secondary,
    compatible: {
      very: primary.very_compatible.map(id => lookup[id]),
      okay: primary.compatible.map(id => lookup[id])
    },
    all: ranked.map(archetype => {
      const tier = level(archetype.score);
      return { ...archetype, level: tier, avatar: TIER_APPEARANCE[tier] };
    })
  };
}

export { ARCHETYPES, TIER_APPEARANCE };
