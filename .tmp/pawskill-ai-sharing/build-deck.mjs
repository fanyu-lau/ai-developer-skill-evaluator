import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Users/yunze/Desktop/ai-developer-skill-evaluator/PawSkill_AI_Developer_Sharing_Archetypes.pptx";
const OUT_DIR = "/Users/yunze/Desktop/ai-developer-skill-evaluator/.tmp/pawskill-ai-sharing/rendered-archetypes";
const ASSET_DIR = "/Users/yunze/Desktop/ai-developer-skill-evaluator/.tmp/pawskill-ai-sharing/assets";

const C = {
  ink: "#10221C",
  muted: "#52645C",
  green: "#4A9569",
  greenDark: "#347C5A",
  greenPale: "#E5F3E8",
  blue: "#5084A2",
  bluePale: "#E2EFF5",
  amber: "#D49749",
  amberPale: "#F9EEDC",
  paper: "#F7F8F5",
  panel: "#EDF1ED",
  rule: "#CAD3CC",
  white: "#FFFFFF",
  soft: "#F1F4F1",
  red: "#B35142",
};

const page = { left: 72, top: 58, width: 1136, height: 604 };

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, position, style = {}, name) {
  const box = slide.shapes.add({
    geometry: "textbox",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    typeface: "Helvetica Neue",
    fontSize: style.fontSize ?? 20,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    ...style,
  };
  return box;
}

function addRect(slide, position, fill, radius = 0, lineFill = fill, name) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position,
    fill,
    line: { style: "solid", fill: lineFill, width: lineFill === "none" ? 0 : 1 },
    borderRadius: radius || undefined,
  });
}

function addLine(slide, position, color = C.rule, width = 1, name) {
  return slide.shapes.add({
    geometry: "line",
    name,
    position,
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function title(slide, kicker, headline, num) {
  addText(slide, kicker.toUpperCase(), { left: page.left, top: 42, width: 740, height: 24 }, { fontSize: 14, bold: true, color: C.greenDark }, `kicker-${num}`);
  addText(slide, headline, { left: page.left, top: 84, width: 1025, height: 66 }, { fontSize: 38, bold: true, color: C.ink }, `title-${num}`);
  addText(slide, String(num).padStart(2, "0"), { left: 1146, top: 666, width: 62, height: 20 }, { fontSize: 13, color: C.muted, alignment: "right" }, `number-${num}`);
}

function notes(slide, source) {
  slide.speakerNotes.textFrame.setText(`[Sources]\n${source}`);
  slide.speakerNotes.setVisible(true);
}

function bullet(slide, x, y, text, color = C.green, width = 430) {
  addRect(slide, { left: x, top: y + 7, width: 10, height: 10 }, color, 5, color);
  addText(slide, text, { left: x + 24, top: y, width, height: 54 }, { fontSize: 19, color: C.ink }, undefined);
}

function metric(slide, x, y, value, label, sub, accent, name) {
  addRect(slide, { left: x, top: y, width: 332, height: 218 }, C.white, 18, C.rule, `${name}-card`);
  addRect(slide, { left: x, top: y, width: 12, height: 218 }, accent, 0, accent, `${name}-accent`);
  addText(slide, value, { left: x + 36, top: y + 34, width: 254, height: 64 }, { fontSize: 52, bold: true, color: C.ink }, `${name}-value`);
  addText(slide, label, { left: x + 36, top: y + 111, width: 256, height: 34 }, { fontSize: 21, bold: true, color: C.ink }, `${name}-label`);
  addText(slide, sub, { left: x + 36, top: y + 154, width: 256, height: 40 }, { fontSize: 16, color: C.muted }, `${name}-sub`);
}

function stage(slide, x, y, label, body, color, name) {
  addRect(slide, { left: x, top: y, width: 242, height: 166 }, C.white, 16, C.rule, `${name}-box`);
  addRect(slide, { left: x + 24, top: y + 25, width: 34, height: 34 }, color, 17, color, `${name}-dot`);
  addText(slide, label, { left: x + 74, top: y + 25, width: 150, height: 32 }, { fontSize: 18, bold: true }, `${name}-label`);
  addText(slide, body, { left: x + 24, top: y + 82, width: 192, height: 58 }, { fontSize: 17, color: C.muted }, `${name}-body`);
}

function addAnimal(slide, blob, alt, position, name) {
  return slide.images.add({
    blob,
    contentType: "image/png",
    alt,
    fit: "contain",
    geometry: "roundRect",
    borderRadius: 18,
    position,
    name,
  });
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const animals = {};
  for (const animal of ["chameleon-full", "fox", "owl", "octopus-full", "raven", "elephant"]) {
    animals[animal] = await fs.readFile(`${ASSET_DIR}/${animal}.png`);
  }
  const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

  // 1 — Cover
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    addRect(s, { left: 0, top: 0, width: 1280, height: 720 }, C.paper, 0, C.paper);
    addRect(s, { left: 805, top: 0, width: 475, height: 720 }, C.greenDark, 0, C.greenDark);
    addRect(s, { left: 845, top: 92, width: 330, height: 330 }, C.green, 165, C.green);
    addRect(s, { left: 901, top: 148, width: 218, height: 218 }, C.paper, 109, C.paper);
    addRect(s, { left: 947, top: 194, width: 126, height: 126 }, C.greenPale, 63, C.greenPale);
    addAnimal(s, animals["chameleon-full"], "Thoughtful chameleon mascot", { left: 832, top: 72, width: 374, height: 548 }, "cover-chameleon");
    addText(s, "AI DEVELOPER SKILL EVALUATOR", { left: 72, top: 74, width: 530, height: 28 }, { fontSize: 15, bold: true, color: C.greenDark }, "cover-kicker");
    addText(s, "PawSkill", { left: 72, top: 176, width: 600, height: 88 }, { fontSize: 66, bold: true, color: C.ink }, "cover-title");
    addText(s, "Evidence-first reflection for AI-assisted engineering", { left: 72, top: 284, width: 600, height: 94 }, { fontSize: 31, color: C.ink }, "cover-subtitle");
    addText(s, "A private, developmental prototype — not an employee scoring system", { left: 72, top: 552, width: 590, height: 50 }, { fontSize: 19, color: C.muted }, "cover-foot");
    addText(s, "Internal sharing · August 2026", { left: 72, top: 648, width: 380, height: 24 }, { fontSize: 14, color: C.muted }, "cover-date");
    notes(s, "README.md — purpose and intended-use constraints.\nGenerated asset: chameleon editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 2 — problem
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "The problem", "AI activity is not the same as engineering evidence", 2);
    addText(s, "Teams can see more work happening with AI, but raw tool activity alone cannot tell us whether a change was sound, tested, or valuable.", { left: 72, top: 176, width: 702, height: 80 }, { fontSize: 24, color: C.muted }, "problem-intro");
    addLine(s, { left: 632, top: 292, width: 0, height: 268 }, C.rule, 2, "problem-divider");
    addText(s, "WHAT ACTIVITY CAN SHOW", { left: 92, top: 302, width: 410, height: 25 }, { fontSize: 15, bold: true, color: C.greenDark }, "activity-head");
    bullet(s, 92, 356, "An investigation happened before a code change", C.green, 430);
    bullet(s, 92, 427, "A developer iterated on an AI suggestion", C.green, 430);
    bullet(s, 92, 498, "A test command was run during a session", C.green, 430);
    addText(s, "WHAT IT CANNOT PROVE", { left: 688, top: 302, width: 410, height: 25 }, { fontSize: 15, bold: true, color: C.red }, "limits-head");
    bullet(s, 688, 356, "The root cause was correct", C.red, 430);
    bullet(s, 688, 427, "The solution improved quality or impact", C.red, 430);
    bullet(s, 688, 498, "The pattern represents individual performance", C.red, 430);
    addAnimal(s, animals.fox, "Fox mascot", { left: 1112, top: 50, width: 94, height: 100 }, "problem-fox");
    notes(s, "README.md — observed workflow signals are not conclusions about code quality, productivity, seniority, or business impact.\nGenerated asset: fox editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 3 — model
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "The approach", "Evidence first. Workflow context second.", 3);
    addText(s, "The model deliberately separates what was observed from what was independently supported.", { left: 72, top: 164, width: 860, height: 38 }, { fontSize: 23, color: C.muted }, "model-subtitle");
    // connectors created first so they sit behind nodes
    addLine(s, { left: 328, top: 386, width: 74, height: 0 }, C.rule, 3, "flow-1");
    addLine(s, { left: 603, top: 386, width: 74, height: 0 }, C.rule, 3, "flow-2");
    addLine(s, { left: 878, top: 386, width: 74, height: 0 }, C.rule, 3, "flow-3");
    stage(s, 72, 303, "Inputs", "Activity, delivery signals, and curated evidence", C.blue, "inputs");
    stage(s, 347, 303, "Evidence tiers", "Observed, corroborated, and verified", C.amber, "tiers");
    stage(s, 622, 303, "Competencies", "Six engineering practice areas", C.green, "competencies");
    stage(s, 897, 303, "Coaching", "Small habits to practise — never a verdict", C.greenDark, "coaching");
    addAnimal(s, animals["octopus-full"], "Octopus mascot", { left: 1042, top: 166, width: 164, height: 125 }, "model-octopus");
    addText(s, "Key design choice: a session may be promoted only when it time-correlates with an approved, CI-passed merged PR — still capped as verified rather than treated as certain proof.", { left: 72, top: 565, width: 1080, height: 46 }, { fontSize: 18, color: C.ink }, "model-callout");
    notes(s, "README.md — competency model, evidence weights, and 72-hour Git/Claude time-correlation rule.\nGenerated asset: octopus editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 4 — privacy
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "Privacy boundary", "Privacy is a product feature", 4);
    addText(s, "The assessment is designed to minimise data collection while keeping the evidence traceable and useful for self-reflection.", { left: 72, top: 164, width: 930, height: 38 }, { fontSize: 23, color: C.muted }, "privacy-subtitle");
    addRect(s, { left: 72, top: 252, width: 526, height: 312 }, C.greenPale, 20, C.greenPale, "privacy-kept");
    addRect(s, { left: 682, top: 252, width: 526, height: 312 }, C.white, 20, C.rule, "privacy-not-kept");
    addText(s, "Kept locally", { left: 110, top: 290, width: 250, height: 34 }, { fontSize: 25, bold: true, color: C.greenDark }, "kept-title");
    bullet(s, 110, 347, "Aggregated session counts and workflow indicators", C.greenDark, 422);
    bullet(s, 110, 421, "Pseudonymous references and timestamps for correlation", C.greenDark, 422);
    bullet(s, 110, 495, "Outcome metadata from merged pull requests", C.greenDark, 422);
    addText(s, "Explicitly not stored", { left: 720, top: 290, width: 320, height: 34 }, { fontSize: 25, bold: true, color: C.red }, "not-kept-title");
    bullet(s, 720, 347, "Prompts, transcripts, source code, commands, or tool I/O", C.red, 422);
    bullet(s, 720, 421, "PR titles, bodies, branch names, diffs, or authors", C.red, 422);
    bullet(s, 720, 495, "Employee rankings, hiring, promotion, or compensation claims", C.red, 422);
    addAnimal(s, animals.owl, "Owl mascot", { left: 1054, top: 102, width: 145, height: 114 }, "privacy-owl");
    notes(s, "README.md; data/claude-history-summary.json; data/git-history-summary.json — local, privacy-minimised summaries and prohibited uses.\nGenerated asset: owl editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 5 — activity signal snapshot
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "Example signal", "The local history highlights habits — not a scorecard", 5);
    addText(s, "This prototype analysed 65 Claude Code sessions and surfaced a strong investigation habit alongside a clear validation opportunity.", { left: 72, top: 164, width: 1056, height: 42 }, { fontSize: 23, color: C.muted }, "example-subtitle");
    metric(s, 72, 270, "97%", "Investigated before changing", "Across relevant sessions", C.green, "metric-investigate");
    metric(s, 474, 270, "88%", "Iterated collaboratively", "Across relevant sessions", C.blue, "metric-iterate");
    metric(s, 876, 270, "5%", "Ran tests during sessions", "A coaching opportunity", C.amber, "metric-test");
    addRect(s, { left: 72, top: 536, width: 1136, height: 76 }, C.white, 14, C.rule, "example-footer");
    addText(s, "Interpretation: investigation and iteration are observable workflow patterns. Validation should be strengthened with test execution and independently verified outcomes.", { left: 102, top: 556, width: 1070, height: 34 }, { fontSize: 19, color: C.ink }, "example-interpretation");
    notes(s, "data/claude-history-summary.json — 65 sessions; investigation_before_change 97%; iterative_collaboration 88%; test_execution 5%. These are provisional observed-practice indicators.");
  }

  // 6 — delivery evidence chart
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "Outcome evidence", "Delivery signals add independent context to AI activity", 6);
    addText(s, "From 100 analysed merged pull requests, the strongest opportunity is to make validation a more routine part of delivery.", { left: 72, top: 164, width: 1070, height: 42 }, { fontSize: 23, color: C.muted }, "delivery-subtitle");
    s.charts.add("bar", {
      position: { left: 72, top: 256, width: 670, height: 330 },
      categories: ["Approved on review", "Passed CI checks", "Included test-file changes"],
      series: [{ name: "Rate", values: [67, 56, 5], fill: C.green }],
      hasLegend: false,
      dataLabels: { showValue: true, position: "outEnd" },
      chartFill: C.paper,
      chartLine: { style: "solid", width: 0, fill: C.paper },
      plotAreaFill: { type: "none" },
      plotAreaLine: { style: "solid", width: 0, fill: C.paper },
      xAxis: { visible: true, deleted: false, min: 0, max: 100, majorUnit: 25, majorGridlines: { style: "solid", width: 1, fill: C.rule }, line: { style: "solid", width: 0, fill: C.paper }, textStyle: { typeface: "Helvetica Neue", fontSize: "14px", color: C.muted } },
      yAxis: { visible: true, deleted: false, line: { style: "solid", width: 0, fill: C.paper }, textStyle: { typeface: "Helvetica Neue", fontSize: "15px", color: C.ink } },
    });
    addRect(s, { left: 810, top: 256, width: 360, height: 330 }, C.white, 20, C.rule, "delivery-callout");
    addText(s, "What this tells us", { left: 850, top: 302, width: 264, height: 36 }, { fontSize: 25, bold: true, color: C.greenDark }, "delivery-callout-title");
    addText(s, "Review and CI provide meaningful delivery context. Test-file changes are only a proxy, but the 5% rate is a useful prompt to examine the team’s testing practice.", { left: 850, top: 370, width: 270, height: 154 }, { fontSize: 20, color: C.ink }, "delivery-callout-text");
    addText(s, "Rates are aggregate practice indicators, not individual capability or impact measures.", { left: 72, top: 614, width: 880, height: 26 }, { fontSize: 16, color: C.muted }, "delivery-footnote");
    addAnimal(s, animals.raven, "Raven mascot", { left: 1122, top: 520, width: 52, height: 58 }, "delivery-raven");
    notes(s, "data/git-history-summary.json — 100 merged PRs; review approval rate 67%; CI pass rate 56%; test-file-change rate 5%. The summary explicitly excludes individual competency claims.\nGenerated asset: raven editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 7 — profile interpretation
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "Feedback experience", "Confidence turns evidence into coaching", 7);
    addText(s, "Scores are useful only when paired with evidence strength and the ability to say “unscored”.", { left: 72, top: 164, width: 950, height: 38 }, { fontSize: 23, color: C.muted }, "profile-subtitle");
    const rows = [
      ["Problem solving", 97, 33, C.green],
      ["Architecture", 67, 27, "#5A9F86"],
      ["Implementation", 56, 27, "#83A85A"],
      ["Testing", 6, 93, C.amber],
      ["AI collaboration", 88, 33, C.blue],
    ];
    addText(s, "COMPETENCY", { left: 72, top: 259, width: 190, height: 24 }, { fontSize: 14, bold: true, color: C.muted }, "profile-h1");
    addText(s, "EVIDENCE SCORE", { left: 590, top: 259, width: 150, height: 24 }, { fontSize: 14, bold: true, color: C.muted, alignment: "right" }, "profile-h2");
    addText(s, "CONFIDENCE", { left: 1010, top: 259, width: 130, height: 24 }, { fontSize: 14, bold: true, color: C.muted, alignment: "right" }, "profile-h3");
    rows.forEach(([label, score, confidence, color], i) => {
      const y = 307 + i * 54;
      addText(s, label, { left: 72, top: y, width: 250, height: 28 }, { fontSize: 20, bold: i === 0, color: C.ink }, `profile-label-${i}`);
      addRect(s, { left: 340, top: y + 5, width: 330, height: 18 }, C.panel, 9, C.panel, `profile-bar-bg-${i}`);
      addRect(s, { left: 340, top: y + 5, width: 3.3 * score, height: 18 }, color, 9, color, `profile-bar-${i}`);
      addText(s, String(score), { left: 690, top: y - 2, width: 50, height: 32 }, { fontSize: 20, bold: true, alignment: "right" }, `profile-score-${i}`);
      addText(s, `${confidence}%`, { left: 1040, top: y - 2, width: 100, height: 32 }, { fontSize: 20, bold: true, alignment: "right" }, `profile-confidence-${i}`);
    });
    addRect(s, { left: 72, top: 594, width: 1136, height: 48 }, C.bluePale, 12, C.bluePale, "profile-message");
    addText(s, "Debugging remains unscored because there is no supporting evidence — absence of a score is better than an invented conclusion.", { left: 96, top: 607, width: 1040, height: 24 }, { fontSize: 17, color: C.ink }, "profile-message-text");
    addAnimal(s, animals.elephant, "Elephant mascot", { left: 1090, top: 147, width: 116, height: 105 }, "profile-elephant");
    notes(s, "data/profile.json — local example profile: competency scores, confidence levels, and debugging unscored owing to no evidence.\nGenerated asset: elephant editorial mascot, created with OpenAI image generation for this deck.");
  }

  // 8 — archetypes
  {
    const s = deck.slides.add();
    s.background.fill = C.paper;
    title(s, "Work-style archetypes", "A profile can spark reflection without becoming a label", 8);
    addText(s, "The archetypes describe patterns in the available evidence. They are not fixed personalities, job levels, or performance ratings.", { left: 72, top: 164, width: 1030, height: 38 }, { fontSize: 23, color: C.muted }, "archetype-subtitle");

    addRect(s, { left: 72, top: 250, width: 526, height: 288 }, C.greenPale, 20, C.greenPale, "archetype-primary");
    addText(s, "PRIMARY STYLE", { left: 110, top: 286, width: 190, height: 24 }, { fontSize: 14, bold: true, color: C.greenDark }, "primary-style-label");
    addText(s, "Chameleon", { left: 110, top: 328, width: 250, height: 48 }, { fontSize: 34, bold: true, color: C.ink }, "primary-animal");
    addText(s, "The Adapter", { left: 110, top: 376, width: 250, height: 30 }, { fontSize: 22, color: C.greenDark }, "primary-title");
    addText(s, "Flexible and quick to learn; adapts tools and approaches to the real context.", { left: 110, top: 429, width: 300, height: 62 }, { fontSize: 19, color: C.ink }, "primary-description");
    addText(s, "86", { left: 438, top: 320, width: 112, height: 58 }, { fontSize: 46, bold: true, color: C.greenDark, alignment: "right" }, "primary-score");
    addText(s, "evidence score", { left: 390, top: 384, width: 160, height: 24 }, { fontSize: 15, color: C.muted, alignment: "right" }, "primary-score-label");

    addRect(s, { left: 682, top: 250, width: 526, height: 288 }, C.white, 20, C.rule, "archetype-secondary");
    addText(s, "SECONDARY STYLE", { left: 720, top: 286, width: 200, height: 24 }, { fontSize: 14, bold: true, color: "#A65336" }, "secondary-style-label");
    addText(s, "Fox", { left: 720, top: 328, width: 250, height: 48 }, { fontSize: 34, bold: true, color: C.ink }, "secondary-animal");
    addText(s, "The Strategist", { left: 720, top: 376, width: 250, height: 30 }, { fontSize: 22, color: "#A65336" }, "secondary-title");
    addText(s, "Resourceful and deliberate; frames ambiguity and chooses a path with intent.", { left: 720, top: 429, width: 300, height: 62 }, { fontSize: 19, color: C.ink }, "secondary-description");
    addText(s, "84", { left: 1048, top: 320, width: 112, height: 58 }, { fontSize: 46, bold: true, color: "#A65336", alignment: "right" }, "secondary-score");
    addText(s, "evidence score", { left: 1000, top: 384, width: 160, height: 24 }, { fontSize: 15, color: C.muted, alignment: "right" }, "secondary-score-label");

    addRect(s, { left: 72, top: 572, width: 1136, height: 70 }, C.bluePale, 14, C.bluePale, "archetype-footer");
    addText(s, "Current grade: Senior · Practitioner", { left: 102, top: 594, width: 440, height: 28 }, { fontSize: 20, bold: true, color: C.ink }, "archetype-grade");
    addText(s, "Useful complements: Octopus — The Systems Thinker · Raven — The Challenger · Dolphin — The Collaborator", { left: 570, top: 582, width: 596, height: 52 }, { fontSize: 17, color: C.ink }, "archetype-complements");
    notes(s, "data/profile.json — primary Chameleon / The Adapter (86), secondary Fox / The Strategist (84), Senior grade and Practitioner tier; archetypes are explicitly framed as evidence-informed work styles, not fixed personality labels or performance ratings.");
  }

  // 9 — closing
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    addText(s, "WHERE WE GO NEXT", { left: 72, top: 68, width: 500, height: 25 }, { fontSize: 14, bold: true, color: "#8ED1A7" }, "next-kicker");
    addText(s, "AI-assisted development needs reflection — not surveillance", { left: 72, top: 122, width: 1010, height: 112 }, { fontSize: 48, bold: true, color: C.white }, "next-title");
    addText(s, "A responsible pilot would prove usefulness, preserve the privacy boundary, and stay explicitly developmental.", { left: 72, top: 286, width: 830, height: 42 }, { fontSize: 23, color: "#D5DFD7" }, "next-subtitle");
    addLine(s, { left: 111, top: 452, width: 926, height: 0 }, "#476257", 2, "next-line");
    const next = [
      ["01", "Volunteer pilot", "Opt-in and private by default"],
      ["02", "Validate signals", "Check usefulness with developers"],
      ["03", "Coach, don’t rank", "Turn evidence into small habits"],
      ["04", "Review safeguards", "Audit data boundaries and misuse risk"],
    ];
    next.forEach(([n, head, body], i) => {
      const x = 72 + i * 280;
      addText(s, n, { left: x, top: 390, width: 90, height: 42 }, { fontSize: 28, bold: true, color: "#8ED1A7" }, `next-no-${i}`);
      addText(s, head, { left: x, top: 478, width: 224, height: 32 }, { fontSize: 20, bold: true, color: C.white }, `next-head-${i}`);
      addText(s, body, { left: x, top: 526, width: 220, height: 46 }, { fontSize: 17, color: "#D5DFD7" }, `next-body-${i}`);
    });
    addText(s, "PawSkill is a learning aid: evidence-first, privacy-minimised, and designed to keep humans in control of the interpretation.", { left: 72, top: 640, width: 940, height: 30 }, { fontSize: 17, color: "#BFD0C4" }, "next-foot");
    notes(s, "README.md — intended self-reflection/development purpose, prohibited evaluation uses, and privacy-minimised design.");
  }

  for (const [i, slide] of deck.slides.items.entries()) {
    const png = await deck.export({ slide, format: "png", scale: 1.5 });
    await writeBlob(`${OUT_DIR}/slide-${String(i + 1).padStart(2, "0")}.png`, png);
  }
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
