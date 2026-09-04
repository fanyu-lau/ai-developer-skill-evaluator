const fallbackCompetencies = [
  { name: "Problem solving", score: 89, change: "+4", color: "#4a9569", tint: "#e5f3e8" },
  { name: "Debugging", score: 94, change: "+9", color: "#347c5a", tint: "#e1f1e6" },
  { name: "Architecture", score: 81, change: "+2", color: "#5a9f86", tint: "#e6f3ed" },
  { name: "Implementation", score: 86, change: "+5", color: "#83a85a", tint: "#eef4dc" },
  { name: "Testing", score: 67, change: "+3", color: "#d49749", tint: "#f9eedc" },
  { name: "AI collaboration", score: 92, change: "+7", color: "#5084a2", tint: "#e2eff5" }
];

const fallbackEvents = [
  { date: "AUG 10", title: "Fixed live-room latency regression", type: "Debugging", detail: "Used profiler evidence to reject an early AI hypothesis; added a regression test before merging.", style: "" },
  { date: "AUG 07", title: "Reviewed authentication refactor", type: "Code review", detail: "Found an unhandled token-refresh path and proposed a safer implementation approach.", style: "review" },
  { date: "AUG 03", title: "Added checkout validation coverage", type: "Testing", detail: "Expanded boundary-case tests after an AI-generated implementation left two scenarios unverified.", style: "test" }
];

function fallbackArchetypes() {
  const primary = { id: "owl", animal: "Owl", title: "The Investigator", icon: "🦉", score: 91, level: "Master", color: "#4f7a61", description: "Observant and methodical. Owls gather context, compare signals and resist the first plausible answer.", strengths: "Turns uncertainty into testable hypotheses.", avatar: { label: "Guide", mark: "✺", description: "Demonstrating broad, consistent practice in complex contexts." } };
  const secondary = { id: "raven", animal: "Raven", title: "The Challenger", icon: "🐦‍⬛", score: 90, level: "Master", color: "#454c60", avatar: { label: "Guide", mark: "✺" } };
  const compatible = { very: [{ id: "fox", animal: "Fox", title: "The Strategist", icon: "🦊", color: "#c17452", score: 84, level: "Senior" }, { id: "badger", animal: "Badger", title: "The Resilient Debugger", icon: "🦡", color: "#697068", score: 79, level: "Senior" }], okay: [{ id: "ant", animal: "Ant", title: "The Validator", icon: "🐜", color: "#b17b48", score: 61, level: "Junior" }, { id: "raven2", animal: "Raven", title: "The Challenger", icon: "🐦‍⬛", color: "#454c60", score: 90, level: "Master" }] };
  return { primary, secondary, compatible, all: [primary, secondary, ...compatible.very, ...compatible.okay] };
}
function renderArchetypes(archetypes = fallbackArchetypes()) {
  const primary = archetypes.primary;
  document.querySelector("#primaryArchetype").innerHTML = `<div class="archetype-orbit tier-avatar-${primary.level.toLowerCase()}"><span class="animal-avatar" style="--animal:${primary.color}">${primary.icon}</span><span class="avatar-mark" aria-label="${primary.avatar.label} avatar">${primary.avatar.mark}</span><span class="tier tier-${primary.level.toLowerCase()}">${primary.level}</span></div><div class="archetype-copy"><p class="eyebrow">Primary archetype <span>${primary.score}% signal</span></p><h3>${primary.animal} <em>·</em> ${primary.title}</h3><p>${primary.description}</p><div class="archetype-strength">${primary.avatar.mark} <b>${primary.avatar.label} avatar:</b> ${primary.avatar.description}</div><div class="secondary-note">Secondary: <b>${archetypes.secondary.icon} ${archetypes.secondary.animal} — ${archetypes.secondary.title}</b></div></div>`;
  const showCompatibility = (items, badge) => items.map(item => `<div class="compatibility-item"><span class="mini-animal" style="--animal:${item.color}">${item.icon}</span><span><b>${item.animal}</b><small>${item.title}</small></span><em class="compatibility-badge ${badge}">${badge === "very" ? "Very compatible" : "Compatible"}</em></div>`).join("");
  document.querySelector("#veryCompatible").innerHTML = showCompatibility(archetypes.compatible.very, "very");
  document.querySelector("#okayCompatible").innerHTML = showCompatibility(archetypes.compatible.okay, "okay");

  const all = archetypes.all ?? [];
  document.querySelector("#archetypeFullGrid").innerHTML = all.map(item => {
    const isCurrent = item.id === primary.id || item.id === archetypes.secondary.id;
    return `<div class="archetype-chip${isCurrent ? " is-current" : ""}"><span class="mini-animal" style="--animal:${item.color}">${item.icon}</span><div class="archetype-chip-copy"><b>${item.animal}</b><small>${item.title}</small></div><span class="archetype-chip-score">${item.score}</span><span class="tier-badge tier-${item.level.toLowerCase()}">${item.level}</span></div>`;
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
let fullTimeline = fallbackEvents;
let timelineExpanded = false;

function renderTimeline() {
  const items = timelineExpanded ? fullTimeline : fullTimeline.slice(0, TIMELINE_PREVIEW_COUNT);
  document.querySelector("#timeline").innerHTML = items.map(event => `
  <div class="event"><time>${event.date}</time><span class="event-dot ${event.style ?? ""}"></span><div><strong>${event.title}</strong><span class="tag">${event.competency ?? event.type}</span><p>${event.detail}</p></div></div>`).join("");

  const viewAllButton = document.querySelector("#viewAllEvidence");
  if (fullTimeline.length <= TIMELINE_PREVIEW_COUNT) {
    viewAllButton.style.display = "none";
  } else {
    viewAllButton.style.display = "";
    viewAllButton.innerHTML = timelineExpanded ? "Show fewer <span>→</span>" : `View all ${fullTimeline.length} <span>→</span>`;
  }
}

function renderDashboard({ dimensions = fallbackCompetencies, timeline = fallbackEvents, overall = 84, prior_delta = 6, verified_outcomes = 36, archetypes = fallbackArchetypes(), ai_collaboration = null, developer = null, period = "No profile yet", sources = [] } = {}) {
  const normalized = dimensions.filter(item => item.score !== null).map(item => ({ ...item, change: item.change ?? `+${Math.max(1, Math.round((item.score - 70) / 4))}` }));
  document.querySelector(".score-line strong").textContent = overall;
  document.querySelector(".score-line em").textContent = prior_delta === null ? "New" : `${prior_delta >= 0 ? "+" : ""}${prior_delta} pts`;
  document.querySelector(".score-card p b").textContent = `${verified_outcomes} verified outcomes.`;
  document.querySelector(".score-meter span").style.width = `${overall}%`;
  document.querySelector("#competencyGrid").innerHTML = normalized.map(item => `
  <article>
    <div class="competency-top"><h3>${item.name}</h3><span class="score-badge" style="color:${item.color};background:${item.tint}">${item.score}/100</span></div>
    <div class="competency-score"><b>${item.score}</b><span>evidence score</span></div>
    <div class="mini-bar"><i style="width:${item.score}%;background:${item.color}"></i></div>
    <div class="trend"><b>${item.change} pts</b> from prior period</div>
  </article>`).join("");

  fullTimeline = timeline;
  timelineExpanded = false;
  renderTimeline();
  renderAiCollaboration(ai_collaboration);
  renderIdentity({ developer, period, sources });
  renderArchetypes(archetypes);
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
  indicators.innerHTML = historyIndicatorDefinitions.map(([key, label]) => `
    <div><span>${label}</span><b>${practice.indicators[key] ?? 0}%</b></div>`).join("");
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
  status.textContent = new Date(report.generated_at).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  status.classList.remove("unavailable");
  const list = (title, items) => `<p class="eyebrow">${title}</p><ul class="coaching-list">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
  body.innerHTML = `
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
document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => { document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active")); link.classList.add("active"); }));
