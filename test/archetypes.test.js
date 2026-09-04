import test from "node:test";
import assert from "node:assert/strict";
import { buildArchetypeProfile } from "../src/archetypes.js";

const dimensions = [
  { id: "problem_solving", score: 89 }, { id: "debugging", score: 94 }, { id: "architecture", score: 81 },
  { id: "implementation", score: 86 }, { id: "testing", score: 67 }, { id: "ai_collaboration", score: 92 }
];

test("archetypes are built from competency evidence and include compatibility", () => {
  const profile = buildArchetypeProfile(dimensions);
  assert.equal(profile.primary.id, "owl");
  assert.equal(profile.primary.level, "Master");
  assert.equal(profile.primary.avatar.label, "Guide");
  assert.equal(profile.primary.avatar.mark, "✺");
  assert.equal(profile.compatible.very.length, 2);
  assert.equal(profile.all.length, 12);
});
