function renderArchetypes(archetypes) {
  if (!archetypes) {
    document.querySelector("#primaryArchetype").innerHTML = `<p class="subtle">Not enough competency evidence yet to compute an archetype. Import history and run npm run evaluate.</p>`;
    document.querySelector("#veryCompatible").innerHTML = "";
    document.querySelector("#okayCompatible").innerHTML = "";
    document.querySelector("#archetypeFullGrid").innerHTML = "";
    return;
  }
  const primary = archetypes.primary;
  document.querySelector("#primaryArchetype").innerHTML = `<div class="archetype-orbit tier-avatar-${primary.level.toLowerCase()}"><span class="animal-avatar" style="--animal:${primary.color}">${primary.icon}</span><span class="avatar-mark" aria-label="${primary.avatar.label} avatar">${primary.avatar.mark}</span><span class="tier tier-${primary.level.toLowerCase()}">${primary.avatar.label}</span></div><div class="archetype-copy"><p class="eyebrow">Primary archetype <span>${primary.score}% signal</span></p><h3>${primary.animal} <em>·</em> ${primary.title}</h3><p>${primary.description}</p><div class="archetype-strength">${primary.avatar.mark} <b>${primary.avatar.label} avatar:</b> ${primary.avatar.description}</div><div class="secondary-note">Secondary: <b>${archetypes.secondary.icon} ${archetypes.secondary.animal} — ${archetypes.secondary.title}</b></div></div>`;
  const showCompatibility = (items, badge) => items.map(item => `<div class="compatibility-item"><span class="mini-animal" style="--animal:${item.color}">${item.icon}</span><span><b>${item.animal}</b><small>${item.title}</small></span><em class="compatibility-badge ${badge}">${badge === "very" ? "Very compatible" : "Compatible"}</em></div>`).join("");
  document.querySelector("#veryCompatible").innerHTML = showCompatibility(archetypes.compatible.very, "very");
  document.querySelector("#okayCompatible").innerHTML = showCompatibility(archetypes.compatible.okay, "okay");

  const all = archetypes.all ?? [];
  document.querySelector("#archetypeFullGrid").innerHTML = all.map(item => {
    const isCurrent = item.id === primary.id || item.id === archetypes.secondary.id;
    return `<div class="archetype-chip${isCurrent ? " is-current" : ""}"><span class="mini-animal" style="--animal:${item.color}">${item.icon}</span><div class="archetype-chip-copy"><b>${item.animal}</b><small>${item.title}</small></div><span class="archetype-chip-score">${item.score}</span><span class="tier-badge tier-${item.level.toLowerCase()}">${item.avatar.label}</span></div>`;
  }).join("");
}
const sourceIcons = { "Claude Code": "✳", GitHub: "◈", "Curated evidence": "◆" };

function renderIdentity({ developer, period, sources }) {
  const name = developer?.name ?? "No profile yet";
  const initials = developer?.initials ?? "–";
  document.querySelector("#accountInitials").textContent = initials;
  document.querySelector("#accountName").innerHTML = `${name}<small>${period}</small>`;
  document.querySelector("#breadcrumbWorkspace").textContent = name;
  document.querySelector("#periodLabel").textContent = period;
  document.querySelector("#profileInitials").textContent = initials;
  document.querySelector("#profileName").textContent = name;

  document.querySelector("#sourcesCount").textContent = `${sources.length} source${sources.length === 1 ? "" : "s"} connected`;
  document.querySelector("#sourcesList").innerHTML = sources.length
    ? sources.map(source => `<span>${sourceIcons[source] ?? "•"} ${source}</span>`).join("")
    : "<span>No sources imported yet</span>";
}

function renderAiCollaboration(ai_collaboration) {
  const container = document.querySelector("#aiCollaboration");
  if (!ai_collaboration) {
    container.innerHTML = `<p class="subtle">Not enough data yet. PawSkill doesn't yet derive a real signal for how AI suggestions are used, modified, or rejected.</p>`;
    return;
  }
  const { used_directly, modified, rejected, edits_analysed } = ai_collaboration;
  container.innerHTML = `
  <div class="donut-wrap"><div class="donut" style="background:conic-gradient(var(--green) 0 ${used_directly}%,var(--lime) ${used_directly}% ${used_directly + modified}%,var(--orange) ${used_directly + modified}% 100%)"><div><strong>${used_directly}%</strong><span>directly used</span></div></div><ul><li><i class="dot direct"></i><span>Used directly</span><b>${used_directly}%</b></li><li><i class="dot modified"></i><span>Modified</span><b>${modified}%</b></li><li><i class="dot rejected"></i><span>Rejected</span><b>${rejected}%</b></li></ul></div>
  <div class="ai-stat"><span>${edits_analysed}</span><p>AI-proposed edits classified from local session activity.</p></div>
  <p class="subtle">Approximate — inferred from what happened next in each session (another edit, a git revert, or neither), not a per-suggestion audit.</p>`;
}

const TIMELINE_PREVIEW_COUNT = 3;
let fullTimeline = [];
let timelineExpanded = false;

function renderTimeline() {
  const items = timelineExpanded ? fullTimeline : fullTimeline.slice(0, TIMELINE_PREVIEW_COUNT);
  document.querySelector("#timeline").innerHTML = items.length
    ? items.map(event => `
  <div class="event"><time>${event.date}</time><span class="event-dot ${event.style ?? ""}"></span><div><strong>${event.title}</strong><span class="tag">${event.competency ?? event.type}</span><p>${event.detail}</p></div></div>`).join("")
    : `<p class="subtle">No evidence yet — import history and run npm run evaluate.</p>`;

  const viewAllButton = document.querySelector("#viewAllEvidence");
  if (fullTimeline.length <= TIMELINE_PREVIEW_COUNT) {
    viewAllButton.style.display = "none";
  } else {
    viewAllButton.style.display = "";
    viewAllButton.innerHTML = timelineExpanded ? "Show fewer <span>→</span>" : `View all ${fullTimeline.length} <span>→</span>`;
  }
}

function renderDashboard({ dimensions = [], timeline = [], overall = null, prior_delta = null, verified_outcomes = 0, archetypes = null, ai_collaboration = null, measurement_check = null, developer = null, period = "No profile yet", sources = [] } = {}) {
  const normalized = dimensions.filter(item => item.score !== null);
  document.querySelector(".score-line strong").textContent = overall === null ? "–" : overall;
  document.querySelector(".score-line em").textContent = overall === null ? "" : prior_delta === null ? "New" : `${prior_delta >= 0 ? "+" : ""}${prior_delta} pts`;
  document.querySelector("#scoreSummary").innerHTML = overall === null
    ? `No profile yet — run <code>npm run evaluate</code> after importing history.`
    : `Strong, repeatable engineering habits backed by <b>${verified_outcomes} verified outcome${verified_outcomes === 1 ? "" : "s"}.</b>`;
  document.querySelector(".score-meter span").style.width = `${overall ?? 0}%`;
  document.querySelector("#competencyGrid").innerHTML = normalized.length
    ? normalized.map(item => `
  <article>
    <div class="competency-top"><h3>${item.name}</h3><span class="score-badge" style="color:${item.color};background:${item.tint}">${item.score}/100</span></div>
    <div class="competency-score"><b>${item.score}</b><span>evidence score</span></div>
    <div class="mini-bar"><i style="width:${item.score}%;background:${item.color}"></i></div>
    ${item.change
      ? `<div class="trend"><b>${item.change} pts</b> from prior period</div>`
      : `<div class="trend subtle">${Number.isFinite(item.evidence_count) ? `${item.evidence_count} evidence item${item.evidence_count === 1 ? "" : "s"}${item.verified_count ? ` · ${item.verified_count} verified` : ""} · ${item.confidence ?? 0}% confidence` : "No prior-period comparison yet"}</div>`}
  </article>`).join("")
    : `<p class="subtle">No competencies scored yet — import history and run npm run evaluate.</p>`;

  fullTimeline = timeline;
  timelineExpanded = false;
  renderTimeline();
  renderAiCollaboration(ai_collaboration);
  renderIdentity({ developer, period, sources });
  renderArchetypes(archetypes);
  renderMeasurementCheck(measurement_check);
  renderInsight(dimensions);
}

/** Replaces the old hardcoded "Debugging is your edge" copy with a real
 * read of the current dimensions: the strongest dimension with evidence, and
 * either a dimension with no evidence at all or (if every dimension has some)
 * the weakest-scoring one — never an invented claim about a dimension that
 * has zero evidence behind it. */
function renderInsight(dimensions) {
  const headline = document.querySelector("#insightHeadline");
  const body = document.querySelector("#insightBody");
  const focus = document.querySelector("#insightFocus");
  const arrow = document.querySelector("#insightArrow");

  const scored = dimensions.filter(item => item.score !== null);
  if (!scored.length) {
    headline.textContent = "Not enough evidence yet";
    body.textContent = "Import your Claude history and/or GitHub PRs, then run npm run evaluate.";
    focus.textContent = "—";
    arrow.textContent = "–";
    return;
  }

  const strongest = [...scored].sort((a, b) => b.score - a.score)[0];
  arrow.textContent = "↗";
  headline.textContent = `${strongest.name} is your strongest signal`;
  body.textContent = Number.isFinite(strongest.evidence_count)
    ? `${strongest.score}/100 from ${strongest.evidence_count} evidence item${strongest.evidence_count === 1 ? "" : "s"}${strongest.verified_count ? `, ${strongest.verified_count} verified` : ""}.`
    : `${strongest.score}/100 evidence score.`;

  const missing = dimensions.filter(item => item.score === null);
  if (missing.length) {
    focus.textContent = `No evidence yet for ${missing.map(item => item.name).join(", ")}.`;
  } else {
    const weakest = [...scored].sort((a, b) => a.score - b.score)[0];
    focus.textContent = `${weakest.name} has the lowest evidence score (${weakest.score}/100) — worth adding evidence here.`;
  }
}

function renderMeasurementCheck(pairs) {
  const body = document.querySelector("#measurementCheckBody");
  const caveat = document.querySelector("#measurementCheckCaveat");
  if (!pairs || !pairs.length) {
    body.innerHTML = "";
    caveat.textContent = "Needs both Claude history and GitHub history imported to compare independent signals against each other.";
    return;
  }
  body.innerHTML = pairs.map(pair => `
    <div><span>${pair.claude_signal.label} <small>(${pair.claude_signal.source}, n=${pair.claude_signal.n})</small></span><b>${pair.claude_signal.value}%${pair.claude_signal.stats ? ` <small>±${pair.claude_signal.stats.margin}</small>` : ""}</b></div>
    <div><span>${pair.git_signal.label} <small>(${pair.git_signal.source}, n=${pair.git_signal.n})</small></span><b>${pair.git_signal.value}%${pair.git_signal.stats ? ` <small>±${pair.git_signal.stats.margin}</small>` : ""}</b></div>`).join("");
  caveat.textContent = pairs.map(pair => pair.note).join(" ");
}

const numberFormat = new Intl.NumberFormat("en-US");
const historyMetricDefinitions = [
  ["sessions", "Sessions"],
  ["user_turns", "Your turns"],
  ["assistant_turns", "Claude turns"],
  ["code_changes", "Code changes"],
  ["commands", "Commands"],
  ["test_commands", "Test commands"]
];
const historyIndicatorDefinitions = [
  ["investigation_before_change", "Investigated before changing"],
  ["validation_during_change", "Validated while changing"],
  ["iterative_collaboration", "Iterative collaboration"],
  ["test_execution", "Test execution"]
];

function renderClaudeHistory(history) {
  const status = document.querySelector("#historyStatus");
  const description = document.querySelector("#historyDescription");
  const metrics = document.querySelector("#historyMetrics");
  const indicators = document.querySelector("#historyIndicators");
  const caveat = document.querySelector("#historyCaveat");

  if (!history?.totals || !history?.observed_practice) {
    status.textContent = "Not imported";
    status.classList.add("unavailable");
    description.textContent = "Run npm run import:claude-history -- --input-dir ~/.claude/projects, then refresh this page.";
    metrics.innerHTML = "";
    indicators.innerHTML = "";
    caveat.textContent = "Claude history is displayed separately from competency scores and verified engineering evidence.";
    return;
  }

  const practice = history.observed_practice;
  status.textContent = `${numberFormat.format(practice.sessions_analysed)} sessions imported`;
  status.classList.remove("unavailable");
  description.textContent = "Derived locally from Claude Code history. Raw prompts, transcripts, source code, commands, and tool input/output are not shown or retained here.";
  metrics.innerHTML = historyMetricDefinitions.map(([key, label]) => `
    <div><strong>${numberFormat.format(history.totals[key] ?? 0)}</strong><span>${label}</span></div>`).join("");
  indicators.innerHTML = historyIndicatorDefinitions.map(([key, label]) => {
    const stats = practice.indicator_stats?.[key];
    return `<div><span>${label}</span><b>${practice.indicators[key] ?? 0}%${stats ? ` <small>±${stats.margin}</small>` : ""}</b></div>`;
  }).join("");
  caveat.textContent = "These are observed workflow patterns, not competency or performance scores. Verified outcomes remain the basis for the engineering profile above.";
}

const coachingReportDefinitions = [
  { url: "data/claude-evaluation.json", statusId: "claudeCoachingStatus", bodyId: "claudeCoachingBody", command: "make evaluate-claude" },
  { url: "data/codex-evaluation.json", statusId: "codexCoachingStatus", bodyId: "codexCoachingBody", command: "make evaluate-codex" },
  { url: "data/prompting-feedback.json", statusId: "promptingCoachingStatus", bodyId: "promptingCoachingBody", command: "make evaluate-prompting" }
];

function renderCoachingReport(report, { statusId, bodyId, command }) {
  const status = document.querySelector(`#${statusId}`);
  const body = document.querySelector(`#${bodyId}`);
  if (!report?.summary) {
    status.textContent = "Not generated";
    status.classList.add("unavailable");
    body.innerHTML = `<p class="subtle">Run <code>${command}</code>, then refresh this page.</p>`;
    return;
  }
  const generatedDate = new Date(report.generated_at);
  status.textContent = generatedDate.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  status.classList.remove("unavailable");
  const list = (title, items) => `<p class="eyebrow">${title}</p><ul class="coaching-list">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
  const check = report.guideline_check;
  const guidelineWarning = check && !check.passed
    ? `<p class="history-caveat" style="color:#a13a2f"><b>⚠ Guideline check failed:</b> this response may have violated its own rules (${check.violations.map(v => `"${v.term}" in ${v.field}`).join(", ")}). Read it critically before trusting it.</p>`
    : "";
  const ageDays = Math.floor((Date.now() - generatedDate.getTime()) / 86400000);
  const staleNote = ageDays >= 1
    ? `<p class="history-caveat">📌 Snapshot from ${generatedDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} (${ageDays} day${ageDays === 1 ? "" : "s"} ago) — it does not update on its own. Re-run <code>${command}</code> to refresh it against your current history.</p>`
    : "";
  body.innerHTML = `
    ${guidelineWarning}
    ${staleNote}
    <p class="subtle">${report.summary}</p>
    ${list("Strengths", report.strengths)}
    ${list("Opportunities", report.opportunities)}
    ${list("Next actions", report.recommended_next_actions)}
    ${list("Caveats", report.caveats)}
    ${report.analysis_scope ? `<p class="history-caveat">${report.analysis_scope}</p>` : ""}`;
}

renderDashboard();
renderClaudeHistory();
coachingReportDefinitions.forEach(definition => renderCoachingReport(null, definition));
fetch("data/profile.json").then(response => response.ok ? response.json() : Promise.reject()).then(renderDashboard).catch(() => {});
fetch("data/claude-history-summary.json").then(response => response.ok ? response.json() : Promise.reject()).then(renderClaudeHistory).catch(() => renderClaudeHistory());
coachingReportDefinitions.forEach(definition => {
  fetch(definition.url).then(response => response.ok ? response.json() : Promise.reject()).then(report => renderCoachingReport(report, definition)).catch(() => renderCoachingReport(null, definition));
});

const toast = document.querySelector("#toast");
function showToast(message) { toast.textContent = message; toast.classList.add("show"); window.setTimeout(() => toast.classList.remove("show"), 2800); }
document.querySelector("#reportButton").addEventListener("click", () => {
  timelineExpanded = true;
  renderTimeline();
  document.querySelector("#archetypeFull").hidden = false;
  window.print();
});
document.querySelector("#periodButton").addEventListener("click", () => showToast("This shows all imported history — a date-range filter isn't built yet."));
document.querySelector("#archetypeInfo").addEventListener("click", () => {
  const panel = document.querySelector("#archetypeFull");
  panel.hidden = !panel.hidden;
  document.querySelector("#archetypeInfo").innerHTML = panel.hidden ? "How this works <span>→</span>" : "Hide all animals <span>→</span>";
});
document.querySelector("#scoringInfo").addEventListener("click", () => showToast("Verified evidence counts most, then corroborated, then observed activity. See the README's Evidence data and scoring section for the full weighting."));
document.querySelector("#viewAllEvidence").addEventListener("click", () => { timelineExpanded = !timelineExpanded; renderTimeline(); });
document.querySelector("#notificationsButton").addEventListener("click", () => showToast("Notifications aren't built yet."));
document.querySelector("#manageSourcesButton").addEventListener("click", () => showToast("Source management isn't built yet — add sources with npm run import:claude-history or npm run import:git-history."));
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => { document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active")); link.classList.add("active"); }));
