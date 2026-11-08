// ===== SETTINGS =====
const SUPABASE_URL = "https://lgbtckexyubvhskgljzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_iBVXrI8v9e8dUtT6wF51jw_8iycTB-8";
const CHAT_URL = SUPABASE_URL + "/functions/v1/rapid-endpoint";
const PLAN_URL = SUPABASE_URL + "/functions/v1/quick-service";
const PAGE_URL = SUPABASE_URL + "/functions/v1/smart-service";

let sb = null;
try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { sb = null; }

// extra styles for the research screen
const extraStyle = document.createElement("style");
extraStyle.textContent = [
  ".kv{display:grid;grid-template-columns:100px 1fr;gap:6px 12px;font-size:14px;margin:0}",
  ".kv dt{color:var(--muted)}",
  ".kv dd{margin:0;overflow-wrap:anywhere}",
  ".kv a,.lnk a{color:var(--orange-d);text-decoration:underline}",
  ".urlrow{display:flex;gap:8px}",
  ".urlrow input{flex:1;min-width:0;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;font-family:inherit}",
  ".tblwrap{overflow-x:auto;margin-top:8px}",
  ".tbl{border-collapse:collapse;font-size:13px;min-width:100%}",
  ".tbl td,.tbl th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}",
  ".hl{padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px;overflow-wrap:anywhere}",
  ".para{margin:0 0 10px;line-height:1.55;font-size:14.5px;overflow-wrap:anywhere}",
  ".lnk{display:block;padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13.5px;overflow-wrap:anywhere}",
  ".lnk small{display:block;color:var(--muted)}",
  ".mini{background:none;border:0;color:var(--orange-d);cursor:pointer;font-size:13.5px;padding:8px 0;text-decoration:underline}",
  ".errbox{background:var(--red-bg);color:var(--red);border-radius:8px;padding:12px;font-size:14px;line-height:1.45}"
].join("");
document.head.appendChild(extraStyle);

// ===== STATE =====
let user = null, workspace = null, mode = "in";
let tasks = [], approvalList = [], reports = [], reportCount = 0, dataLoaded = false;
let chat = [], chatBusy = false, wsTab = "task", draft = "", planBusy = false;
let taskFilter = "all", taskQuery = "";
let readUrl = "", readBusy = false, readError = "", readResult = null, showAllText = false, showAllLinks = false;
const openG = { "Platform": true };

const LEVELS = { 1: "Quick search", 2: "Standard research", 3: "Deep research", 4: "Extensive research" };
const STEPS = ["Understand the request", "Plan the searches", "Search the web", "Read and extract from pages", "Verify the sources", "Write the report"];
const STEP_ICONS = ["🧠", "🗺️", "🔎", "📖", "🛡️", "📝"];
const STATUS = {
  planned: ["Plan ready", "b-orange"], running: ["Running", "b-yellow"], paused: ["Paused", "b-grey"],
  completed: ["Completed", "b-green"], failed: ["Failed", "b-red"], cancelled: ["Cancelled", "b-grey"]
};
const LOGO = '<svg width="30" height="30" viewBox="0 0 36 36" aria-hidden="true"><rect width="36" height="36" rx="9" fill="#f6531f"/><path d="M7 10l5 16 6-11 6 11 5-16" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="15" r="2.6" fill="#ffd43b"/></svg>';

// ===== PAGES =====
const pages = {};
function P(id, icon, name, desc, feats) { pages[id] = { icon: icon, name: name, desc: desc, feats: feats }; return id; }

const groups = [
 { label: "Platform", items: [
  P("dashboard", "🏠", "Overview", "Your agent activity at a glance.", []),
  P("workspace", "💬", "AI Workspace", "Give WTA a task. It plans the work and shows its progress.", []),
  P("research", "🔎", "Web Research", "Read a public web page and see exactly what WTA found, with its source and time.", ["Search and open several pages for one task", "Cross-check claims across sources", "Save findings to a task and write a report"]),
  P("browser", "🌐", "Browser", "Let WTA open and use websites for you, within strict safety limits.", ["Open pages, click, scroll and read", "Never bypasses logins, CAPTCHAs or paywalls", "Every browser action is logged"]),
  P("tasks", "✅", "Tasks", "Every task you give WTA, with its plan and status.", []),
  P("memory", "🧠", "Agent Memory", "What WTA remembers. View, edit or delete it.", ["Saved preferences and project notes", "View, edit and delete anything stored", "Web content is never saved as trusted memory"]),
  P("files", "📁", "Files and Reports", "Reports and documents WTA creates for you.", ["PDF, Word, CSV and text reports", "Download anything WTA creates", "Organised by project"]),
  P("operations", "🗂️", "Digital Operations", "Run your projects, files and communications from one place.", ["Track projects and ongoing workflows", "Prepare reports and proposals", "Coordinate permitted communications"])
 ]},
 { label: "Academic Intelligence", items: [
  P("assignment", "📝", "Assignment Research", "Turn an assignment into researched, referenced work.", ["Paste a question or upload the assignment", "Research credible sources for each section", "Review, edit and export your result"]),
  P("acadsearch", "📚", "Academic Search", "Find journals, papers, books and institutional reports.", ["Author, title, date, publisher and DOI for every source", "Never invents references", "Shows how each source relates to your topic"]),
  P("litreview", "🧾", "Literature Review", "Build a literature review from real studies.", ["Find and compare existing studies", "Identify themes, agreements and gaps", "Attributed citations and a reference list"]),
  P("pdfreader", "📄", "PDF Reader", "Read and question your uploaded documents.", ["PDF, Word, text and slides", "Summarise, explain and extract definitions", "Answers point to the page or section"]),
  P("lecture", "🎓", "Lecture Assistant", "Turn lecture notes and slides into study material.", ["Organise topics into a course outline", "Explain difficult concepts", "Create notes, examples and revision material"]),
  P("studyplan", "📅", "Study Planner", "Plan what to study and track your progress.", ["Create subjects, courses and study targets", "Schedule study sessions", "See which topics to revisit"]),
  P("quiz", "❓", "Quiz Centre", "Practise with questions that adapt to you.", ["Generate practice questions and quizzes", "Step-by-step explanations", "Track scores by topic"]),
  P("rproject", "🔬", "Research Projects", "Manage a dissertation or research project from start to finish.", ["Objectives, questions and methodology", "Literature review, results and discussion", "Spot missing sections"]),
  P("citations", "🔖", "Citation Generator", "Create citations and reference lists in the style you need.", ["APA 7, MLA, Harvard, Chicago and IEEE", "In-text citations and reference lists", "Check that a reference exists and supports the claim"]),
  P("areports", "🗒️", "Academic Reports", "Export academic work as clean, formatted documents.", ["PDF, Word and text export", "Fonts, spacing, margins and cover pages", "Table of contents and page numbers"])
 ]},
 { label: "AI Capabilities", items: [
  P("agents", "🤝", "Multi-Agent Collaboration", "Specialist agents that work together on bigger tasks.", ["Research, writing, data and browser agents", "A coordinator assigns and checks the work", "One combined result"]),
  P("evolution", "🧬", "Capability Evolution", "When WTA lacks a skill, it proposes a tool to add it.", ["Detect the missing capability", "Test the new tool in a sandbox", "Needs your approval before use"]),
  P("toollib", "🧰", "Tool Library", "The tools WTA can use, and what each one is allowed to do.", ["See every tool and its permissions", "Enable, disable or roll back tools", "Every tool is versioned and reviewed"]),
  P("permissions", "🛡️", "Agent Permissions", "Choose what WTA may do and what needs your approval.", ["Supervised or Autonomous mode", "Approve sensitive actions first", "Usage limits and an emergency stop"]),
  P("workflows", "🔁", "Workflow Automation", "Save a task as a repeatable workflow.", ["Turn tasks into reusable steps", "Run on a schedule", "Review every run in the history"])
 ]},
 { label: "Business and Monetisation", items: [
  P("plans", "💼", "Business Plans", "Plans for businesses and teams.", ["Business workspaces and team roles", "Basic, Professional, Premium and Custom plans", "Usage limits and activity records"]),
  P("marketplace", "🛒", "Developer Marketplace", "Browse tools made by developers, or sell your own.", ["Search tools by category and rating", "Install, disable or remove tools", "Creators earn from every sale"]),
  P("custom", "🛠️", "Custom AI Development", "Request an AI tool built for your needs.", ["Describe the problem and the users", "Receive a proposal and estimated cost", "Track progress and approve the finished tool"]),
  P("enterprise", "🏢", "Enterprise Licensing", "Organisation-wide licences for schools, hospitals and large teams.", ["Departments, roles and central administration", "Audit logs and security policies", "Request a consultation or custom proposal"]),
  P("outreach", "📨", "Smart Outreach", "Find businesses, verify their online presence and write personal messages.", ["Lead lists without duplicates", "Templates with placeholders and a portfolio link", "You approve every message before it is sent"]),
  P("billing", "💳", "Billing and Payments", "Your subscriptions, invoices and payment history.", ["One-time and recurring payments", "Invoices and transaction history", "Payments are verified securely on the server"]),
  P("revenue", "📈", "Revenue Analytics", "Revenue and usage across the platform.", ["Revenue by plan, marketplace and enterprise", "Commissions and creator payouts", "Refunds and disputes"]),
  P("creator", "🧑‍💻", "Creator Dashboard", "Track your tools, installs, ratings and earnings.", ["Installs, usage and feedback", "Earnings and payout status", "Update or withdraw your tools"])
 ]},
 { label: "Integrations", items: [
  P("aiproviders", "🤖", "AI Providers", "Choose which AI model powers WTA.", ["Switch providers without rebuilding anything", "Set a default model", "Track usage per provider"]),
  P("messaging", "✉️", "Email and Messaging", "Connect email and Telegram.", ["Gmail, Outlook, SMTP and Telegram", "Connect, disconnect and see status", "Sending history and failed messages"]),
  P("payproviders", "🏦", "Payment Providers", "Payment providers for subscriptions and the marketplace.", ["Providers for Nigerian and international customers", "Server-side payment verification", "Refunds and payout records"]),
  P("storage", "☁️", "Cloud Storage", "Connect cloud storage for your files.", ["Save reports to your own storage", "Import documents for analysis", "Control what WTA can access"]),
  P("devservices", "🧑‍🔧", "Developer Services", "Tools and connections for developers building on WTA.", ["API access for your own apps", "Webhooks and events", "A sandbox for testing tools"])
 ]},
 { label: "Account", items: [
  P("settings", "⚙️", "Settings", "Your account, workspace and preferences.", ["Profile and workspace details", "Operating mode", "Data export and deletion"]),
  P("apps", "📱", "Apps and Devices", "WTA on every device.", ["Android and iOS apps", "A desktop app", "Tasks and files sync across devices"])
 ]}
];

const side = document.getElementById("side");
const view = document.getElementById("view");
const shade = document.getElementById("shade");

// ===== HELPERS =====
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60); if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
  const d = Math.floor(h / 24); return d + (d === 1 ? " day ago" : " days ago");
}
function badge(status) { const b = STATUS[status] || ["Unknown", "b-grey"]; return '<span class="badge ' + b[1] + '">' + b[0] + '</span>'; }
function go(id) { if (location.hash === "#" + id) render(); else location.hash = "#" + id; }
function stepsDone(t) { return t.status === "completed" ? 6 : 2; }
function isActive(t) { return ["planned", "running", "paused"].indexOf(t.status) >= 0; }
function groupOf(id) { for (let i = 0; i < groups.length; i++) if (groups[i].items.indexOf(id) >= 0) return groups[i].label; return ""; }
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
function linkHtml(u, text) {
  return /^https?:\/\//i.test(u)
    ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow">' + esc(text || u) + '</a>'
    : esc(text || u);
}
function emptyBlock(icon, title, text) {
  const d = el("div", undefined, "empty");
  d.innerHTML = '<div class="ico">' + icon + '</div><b>' + esc(title) + '</b>' + esc(text);
  return d;
}
function makeCard(title, extra) {
  const c = el("div", undefined, "card");
  const h = el("div", undefined, "head-row");
  h.appendChild(el("h3", title));
  if (extra) h.appendChild(extra);
  c.appendChild(h);
  return c;
}
function signInCard(text) {
  const card = el("div", undefined, "card");
  card.appendChild(emptyBlock("🔒", "Sign in to continue", text));
  const w = el("div"); w.style.textAlign = "center";
  const b = el("button", "Sign in", "btn"); b.onclick = openModal;
  w.appendChild(b); card.appendChild(w);
  return card;
}
async function getToken() {
  const s = await sb.auth.getSession();
  const t = s.data.session && s.data.session.access_token;
  if (!t) throw new Error("Please sign in again.");
  return t;
}

// ===== SIDEBAR =====
function buildSide(activeId) {
  const keep = side.scrollTop;
  side.innerHTML = "";
  groups.forEach(function (g) {
    if (g.items.indexOf(activeId) >= 0) openG[g.label] = true;
    const btn = el("button", undefined, "gbtn");
    btn.type = "button";
    btn.appendChild(el("span", g.label));
    const chev = el("span", openG[g.label] ? "▾" : "▸");
    btn.appendChild(chev);
    const box = el("div", undefined, "gitems" + (openG[g.label] ? " open" : ""));
    btn.onclick = function () {
      openG[g.label] = !openG[g.label];
      box.classList.toggle("open");
      chev.textContent = openG[g.label] ? "▾" : "▸";
    };
    g.items.forEach(function (id) {
      const a = el("a", undefined, id === activeId ? "active" : "");
      a.href = "#" + id;
      a.appendChild(el("span", pages[id].icon));
      a.appendChild(document.createTextNode(pages[id].name));
      box.appendChild(a);
    });
    side.appendChild(btn);
    side.appendChild(box);
  });
  const foot = el("div", undefined, "sfoot");
  if (user) {
    const nm = user.email.split("@")[0];
    foot.appendChild(el("div", nm.charAt(0).toUpperCase(), "avatar"));
    const t = el("div");
    t.appendChild(el("b", nm));
    t.appendChild(el("small", workspace ? workspace.name : user.email));
    foot.appendChild(t);
  } else {
    foot.appendChild(el("div", "G", "avatar"));
    const t = el("div");
    t.appendChild(el("b", "Guest"));
    const s = el("button", "Sign in", "btn btn-s"); s.onclick = openModal;
    t.appendChild(s);
    foot.appendChild(t);
  }
  side.appendChild(foot);
  side.scrollTop = keep;
}

// ===== HEADER =====
function renderAuthArea() {
  const area = document.getElementById("authArea");
  area.innerHTML = "";
  if (user) {
    const bell = el("button", "🔔", "bell");
    bell.setAttribute("aria-label", "Pending approvals");
    if (approvalList.length) bell.appendChild(el("i", String(approvalList.length)));
    bell.onclick = function () { go("dashboard"); };
    area.appendChild(bell);
    area.appendChild(el("span", user.email, "who"));
    const out = el("button", "Sign out", "btn btn-o");
    out.onclick = signOut;
    area.appendChild(out);
  } else {
    const inn = el("button", "Sign in", "btn");
    inn.onclick = openModal;
    area.appendChild(inn);
  }
}

// ===== PLAN PIECES =====
function listHtml(arr) { return arr && arr.length ? '<ul class="feat">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' : ""; }
function chipsHtml(arr) { return arr && arr.length ? arr.map(function (q) { return '<span class="qchip">' + esc(q) + '</span>'; }).join("") : ""; }
function sec(title, body) { return body ? '<div class="sec"><h4>' + title + '</h4>' + body + '</div>' : ""; }
function planHtml(p) {
  if (!p) return "";
  const facts = [];
  if (p.topic) facts.push(["Topic", p.topic]);
  if (p.geography) facts.push(["Place", p.geography]);
  if (p.result_count) facts.push(["Results wanted", String(p.result_count)]);
  if (p.output_format) facts.push(["Output", p.output_format]);
  facts.push(["Needs current information", p.needs_current_info ? "Yes" : "No"]);
  return sec("Objective", "<p>" + esc(p.objective) + "</p>") +
    sec("Details", '<dl class="facts">' + facts.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join("") + '</dl>') +
    sec("Research depth", "<p>" + esc(LEVELS[p.recommended_level] || "Standard research") + " (level " + esc(p.recommended_level) + " of 4)</p>") +
    sec("Research questions", listHtml(p.research_questions)) +
    sec("Search queries", chipsHtml(p.queries)) +
    sec("What WTA will collect", listHtml(p.info_to_extract)) +
    sec("Preferred sources", listHtml(p.preferred_sources)) +
    sec("How sources will be judged", listHtml(p.evaluation_criteria)) +
    sec("Assumptions", listHtml(p.assumptions));
}
function nodeHtml(icon, title, sub, state) {
  return '<div class="node ' + state + '"><div class="ni">' + (state === "d" ? "✓" : icon) + '</div><div><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></div></div>';
}
function flowHtml(t) {
  const done = stepsDone(t), p = t.plan || {};
  let h = '<div class="flow">';
  h += nodeHtml("📝", "Your request", t.instruction.length > 140 ? t.instruction.slice(0, 140) + "..." : t.instruction, "d");
  STEPS.forEach(function (s, i) {
    const d = i < done;
    let sub = "Not started";
    if (d && i === 0) sub = p.objective || "Request understood";
    if (d && i === 1) sub = (p.queries ? p.queries.length : 0) + " search queries, " + (LEVELS[p.recommended_level] || "research").toLowerCase();
    if (d && i > 1) sub = "Done";
    h += '<div class="conn ' + (d ? "d" : "") + '"></div>' + nodeHtml(STEP_ICONS[i], s, sub, d ? "d" : "n");
  });
  const fin = t.status === "completed";
  h += '<div class="conn ' + (fin ? "d" : "") + '"></div>' + nodeHtml("🏁", "Task completed", fin ? "Result delivered" : "Not finished", fin ? "d" : "n");
  return h + '</div>';
}

// ===== DATA =====
async function loadWorkspace() {
  workspace = null;
  if (!sb || !user) return;
  const r = await sb.from("workspaces").select("id,name,type").limit(1);
  if (!r.error && r.data && r.data.length) workspace = r.data[0];
}
async function loadData() {
  tasks = []; approvalList = []; reports = []; reportCount = 0;
  if (!sb || !user) return;
  const t = await sb.from("tasks").select("id,title,instruction,plan,level,status,created_at").order("created_at", { ascending: false }).limit(50);
  if (!t.error && t.data) tasks = t.data;
  const a = await sb.from("approvals").select("id,action,details,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(20);
  if (!a.error && a.data) approvalList = a.data;
  const r = await sb.from("reports").select("id,title,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(5);
  if (!r.error && r.data) { reports = r.data; reportCount = r.count || r.data.length; }
  renderAuthArea();
}
async function decide(id, status) {
  const r = await sb.from("approvals").update({ status: status }).eq("id", id);
  if (!r.error) { await loadData(); render(); }
}

// ===== DASHBOARD =====
function statCard(icon, num, label) {
  return '<div class="card stat"><div class="sico">' + icon + '</div><div><div class="num">' + num + '</div><div class="label">' + label + '</div></div></div>';
}
function startTask(prefix, tab) {
  if (!user) { openModal(); return; }
  if (prefix) draft = prefix;
  wsTab = tab || "task";
  go("workspace");
}
function renderDashboard() {
  const name = user ? user.email.split("@")[0] : "";
  const active = tasks.filter(isActive);
  const done = tasks.filter(function (t) { return t.status === "completed"; });

  const dash = el("div", undefined, "dash");
  const main = el("div", undefined, "col");
  const rail = el("div", undefined, "col");

  const g = el("div");
  g.appendChild(el("h2", user ? greeting() + ", " + name : "Welcome to WTA"));
  g.appendChild(el("p", user ? "Here is what WTA is working on." : "Give WTA a task and it plans the work step by step. Sign in to save your tasks.", "sub"));
  g.lastChild.style.marginBottom = "0";
  main.appendChild(g);

  const stats = el("div", undefined, "stats");
  stats.innerHTML = statCard("⚡", active.length, "Active tasks") + statCard("✅", done.length, "Completed workflows") +
    statCard("🔔", approvalList.length, "Pending approvals") + statCard("📄", reportCount, "Reports");
  main.appendChild(stats);

  const wsp = el("div", undefined, "card wsp");
  const wh = el("div", undefined, "wsp-head");
  wh.appendChild(el("h3", "AI Workspace"));
  const open = el("a", "Open full workspace", "btn btn-o btn-s"); open.href = "#workspace";
  wh.appendChild(open);
  wsp.appendChild(wh);
  const body = el("div", undefined, "wsp-body");

  const ai = el("div", undefined, "ai");
  const av = el("div", undefined, "av"); av.innerHTML = LOGO;
  const tx = el("div", undefined, "tx");
  if (user) {
    tx.innerHTML = '<div>Hello ' + esc(name) + '. Here is your brief:</div><ul class="brief">' +
      '<li><span class="bd" style="background:#f6531f"></span>' + active.length + (active.length === 1 ? " active task" : " active tasks") + '</li>' +
      '<li><span class="bd" style="background:#9a6700"></span>' + approvalList.length + (approvalList.length === 1 ? " approval waiting" : " approvals waiting") + '</li>' +
      '<li><span class="bd" style="background:#1a7f37"></span>' + reportCount + (reportCount === 1 ? " report ready" : " reports ready") + '</li></ul>' +
      '<div style="margin-top:8px">What should I work on?</div>';
  } else {
    tx.textContent = "Hello. Tell me what you need done and I will plan it step by step. Sign in to get started.";
  }
  ai.appendChild(av); ai.appendChild(tx);
  body.appendChild(ai);

  const quick = el("div", undefined, "quick");
  [["Plan a task", function () { startTask("", "task"); }],
   ["Read a web page", function () { go("research"); }],
   ["Plan an assignment", function () { startTask("Assignment: ", "task"); }],
   ["Ask a question", function () { startTask("", "ask"); }]].forEach(function (q) {
    const c = el("button", q[0], "chip"); c.type = "button";
    c.onclick = q[1];
    quick.appendChild(c);
  });
  body.appendChild(quick);

  const comp = el("div", undefined, "wsp-comp");
  const ta = document.createElement("textarea");
  ta.placeholder = "Type a task or ask anything";
  ta.maxLength = 2000; ta.value = draft;
  ta.oninput = function () { draft = ta.value; };
  const send = el("button", "➤", "send-round");
  send.setAttribute("aria-label", "Plan this task");
  send.onclick = function () { if (!user) { openModal(); return; } if (!draft.trim()) { ta.focus(); return; } startTask("", "task"); };
  comp.appendChild(ta); comp.appendChild(send);
  body.appendChild(comp);
  wsp.appendChild(body);
  main.appendChild(wsp);

  const c2 = makeCard("Completed workflows");
  if (done.length) done.slice(0, 3).forEach(function (t) {
    const a = el("a", undefined, "feed ok"); a.href = "#task/" + t.id;
    a.innerHTML = '<div class="fi">✓</div><div>' + esc(t.title) + '<small>' + timeAgo(t.created_at) + '</small></div>';
    c2.appendChild(a);
  });
  else c2.appendChild(emptyBlock("✅", "Nothing completed yet", "Finished tasks will be listed here."));
  main.appendChild(c2);

  const c1 = makeCard("Task progress");
  if (active.length) active.slice(0, 5).forEach(function (t) {
    const d = stepsDone(t);
    const a = el("a", undefined, "prow"); a.href = "#task/" + t.id; a.style.display = "block";
    a.innerHTML = '<div class="prow-top"><span>' + esc(t.title) + '</span><span>' + d + ' of 6</span></div><div class="prog"><i style="width:' + Math.round(d / 6 * 100) + '%"></i></div>';
    c1.appendChild(a);
  });
  else c1.appendChild(emptyBlock("⚡", "No active tasks", "Plan a task and its progress will show here."));
  rail.appendChild(c1);

  const c3 = makeCard("Pending approvals");
  if (approvalList.length) approvalList.slice(0, 5).forEach(function (a) {
    const d = el("div", undefined, "arow");
    d.innerHTML = '<b>' + esc(a.action) + '</b><div class="meta"><span>' + esc(a.details || "") + '</span></div>';
    const r = el("div", undefined, "acts");
    const ok = el("button", "Approve", "btn btn-s"); ok.onclick = function () { decide(a.id, "approved"); };
    const no = el("button", "Reject", "btn btn-r btn-s"); no.onclick = function () { decide(a.id, "rejected"); };
    r.appendChild(ok); r.appendChild(no); d.appendChild(r);
    c3.appendChild(d);
  });
  else c3.appendChild(emptyBlock("🔔", "Nothing needs your approval", "WTA will ask here before it takes any consequential action."));
  rail.appendChild(c3);

  const c5 = makeCard("Activity");
  if (tasks.length) tasks.slice(0, 5).forEach(function (t) {
    const a = el("a", undefined, "feed" + (t.status === "completed" ? " ok" : "")); a.href = "#task/" + t.id;
    a.innerHTML = '<div class="fi">' + (t.status === "completed" ? "✓" : "🗺️") + '</div><div>' + (t.status === "completed" ? "Completed: " : "Planned: ") + esc(t.title) + '<small>' + timeAgo(t.created_at) + '</small></div>';
    c5.appendChild(a);
  });
  else c5.appendChild(emptyBlock("🕘", "No activity yet", "Your tasks will show up here."));
  rail.appendChild(c5);

  const c4 = makeCard("Recent reports");
  if (reports.length) reports.forEach(function (r) {
    const d = el("div", undefined, "feed");
    d.innerHTML = '<div class="fi">📄</div><div>' + esc(r.title) + '<small>' + timeAgo(r.created_at) + '</small></div>';
    c4.appendChild(d);
  });
  else c4.appendChild(emptyBlock("📄", "No reports yet", "Reports WTA writes for you will appear here."));
  rail.appendChild(c4);

  dash.appendChild(main); dash.appendChild(rail);
  view.appendChild(dash);
}

// ===== AI WORKSPACE =====
function renderWorkspace() {
  const p = pages.workspace;
  view.appendChild(el("h2", p.icon + " " + p.name));
  view.appendChild(el("p", p.desc, "sub"));
  if (!user) { view.appendChild(signInCard("Sign in to give WTA a task or chat with it.")); return; }

  const bar = el("div", undefined, "tabbar");
  [["task", "New task"], ["ask", "Ask WTA"]].forEach(function (t) {
    const b = el("button", t[1], wsTab === t[0] ? "on" : "");
    b.type = "button";
    b.onclick = function () { wsTab = t[0]; render(); };
    bar.appendChild(b);
  });
  view.appendChild(bar);

  const card = el("div", undefined, "card");
  view.appendChild(card);
  if (wsTab === "task") renderTaskTab(card); else renderAskTab(card);
}

function renderTaskTab(card) {
  card.appendChild(el("h3", "What should WTA do?"));
  const ta = document.createElement("textarea");
  ta.className = "task-ta"; ta.id = "taskInput"; ta.maxLength = 2000;
  ta.style.marginTop = "10px";
  ta.placeholder = "Describe the task in plain English. Add numbers, places and the result you want.";
  ta.value = draft;
  ta.oninput = function () { draft = ta.value; };
  card.appendChild(ta);

  const chips = el("div", undefined, "chips");
  ["Find 10 private universities in Nigeria that offer Computer Science, with their admission requirements",
   "Research the latest developments in artificial intelligence and compare five of them",
   "Find 20 hotels in Abuja that have social media pages but no website"].forEach(function (t) {
    const c = el("button", t, "chip"); c.type = "button";
    c.onclick = function () { ta.value = t; draft = t; ta.focus(); };
    chips.appendChild(c);
  });
  card.appendChild(chips);

  const btn = el("button", planBusy ? "Planning..." : "Plan task", "btn");
  btn.id = "planBtn"; btn.disabled = planBusy;
  btn.onclick = planTask;
  card.appendChild(btn);
  const m = el("div", undefined, "msgline"); m.id = "planMsg";
  card.appendChild(m);
  card.appendChild(el("div", "WTA plans the work first and saves the plan under Tasks. Planning uses one of your daily messages.", "hint"));
}

function setPlanUi(msg) {
  const b = document.getElementById("planBtn");
  if (b) { b.disabled = planBusy; b.textContent = planBusy ? "Planning..." : "Plan task"; }
  const m = document.getElementById("planMsg");
  if (m) m.textContent = msg || "";
}

async function planTask() {
  if (planBusy) return;
  const ta = document.getElementById("taskInput");
  const text = ta ? ta.value.trim() : "";
  if (!text) { setPlanUi("Describe what you want WTA to do."); return; }
  if (!workspace) { setPlanUi("Your workspace is still loading. Try again in a moment."); return; }
  draft = text; planBusy = true; setPlanUi("");
  try {
    const token = await getToken();
    const r = await fetch(PLAN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": SUPABASE_KEY },
      body: JSON.stringify({ request: text })
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok || !data.plan) throw new Error(data.error || "Something went wrong. Please try again.");
    const plan = data.plan;
    const ins = await sb.from("tasks").insert({
      user_id: user.id, workspace_id: workspace.id,
      title: (plan.objective || text).slice(0, 190), instruction: text,
      plan: plan, level: plan.recommended_level, status: "planned"
    }).select("id").single();
    if (ins.error) throw new Error("The plan was made but could not be saved. Please try again.");
    draft = ""; planBusy = false;
    await loadData();
    location.hash = "#task/" + ins.data.id;
  } catch (err) {
    planBusy = false;
    setPlanUi(err.message || "Something went wrong.");
  }
}

function renderAskTab(card) {
  const head = el("div", undefined, "head-row");
  head.appendChild(el("h3", "Chat"));
  const nb = el("button", "New chat", "btn btn-o btn-s");
  nb.onclick = function () { if (chatBusy) return; chat = []; drawChat(); };
  head.appendChild(nb);
  card.appendChild(head);
  const list = el("div", undefined, "chat"); list.id = "chatList";
  card.appendChild(list);
  const comp = el("div", undefined, "composer");
  const ta = document.createElement("textarea");
  ta.id = "chatInput"; ta.placeholder = "Type your message..."; ta.maxLength = 4000; ta.rows = 1;
  ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChat(); } });
  const send = el("button", "Send", "btn"); send.id = "chatSend"; send.onclick = sendChat;
  comp.appendChild(ta); comp.appendChild(send);
  card.appendChild(comp);
  card.appendChild(el("div", "Ask WTA answers from the AI's own knowledge. It cannot browse the web or open links, so double-check important facts.", "hint"));
  drawChat();
}

function drawChat() {
  const list = document.getElementById("chatList");
  if (!list) return;
  list.innerHTML = "";
  if (!chat.length && !chatBusy) list.appendChild(emptyBlock("💬", "Ask WTA anything", "Explain a topic, outline an essay or talk through a plan."));
  chat.forEach(function (m) { list.appendChild(el("div", m.content, "bub " + (m.role === "user" ? "u" : "a") + (m.error ? " err" : ""))); });
  if (chatBusy) list.appendChild(el("div", "Thinking...", "bub a"));
  const send = document.getElementById("chatSend");
  if (send) send.disabled = chatBusy;
  if ((chat.length || chatBusy) && list.lastChild) list.lastChild.scrollIntoView({ block: "end" });
}

async function sendChat() {
  if (chatBusy || !sb || !user) return;
  const ta = document.getElementById("chatInput");
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) return;
  ta.value = "";
  chat.push({ role: "user", content: text });
  chatBusy = true; drawChat();
  try {
    const token = await getToken();
    const history = chat.filter(function (m) { return !m.error; }).map(function (m) { return { role: m.role, content: m.content }; });
    const r = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": SUPABASE_KEY },
      body: JSON.stringify({ messages: history })
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok || !data.reply) throw new Error(data.error || "Something went wrong. Please try again.");
    chat.push({ role: "assistant", content: data.reply });
  } catch (err) {
    chat.push({ role: "assistant", content: err.message || "Something went wrong.", error: true });
  }
  chatBusy = false; drawChat();
}

// ===== WEB RESEARCH (page reader) =====
function renderResearch() {
  const p = pages.research;
  view.appendChild(el("h2", p.icon + " " + p.name));
  view.appendChild(el("p", p.desc, "sub"));
  if (!user) { view.appendChild(signInCard("Sign in to read web pages with WTA.")); return; }

  const col = el("div", undefined, "col");

  const card = el("div", undefined, "card");
  card.appendChild(el("h3", "Read a web page"));
  const row = el("div", undefined, "urlrow");
  row.style.marginTop = "10px";
  const inp = document.createElement("input");
  inp.id = "readUrl"; inp.type = "url"; inp.placeholder = "example.com/page"; inp.maxLength = 2000;
  inp.setAttribute("autocapitalize", "none"); inp.setAttribute("autocorrect", "off");
  inp.value = readUrl;
  inp.oninput = function () { readUrl = inp.value; };
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") readPage(); });
  const btn = el("button", readBusy ? "Reading..." : "Read page", "btn");
  btn.id = "readBtn"; btn.disabled = readBusy;
  btn.onclick = readPage;
  row.appendChild(inp); row.appendChild(btn);
  card.appendChild(row);
  const chips = el("div", undefined, "chips");
  const ex = el("button", "Try: Wikipedia article on Abuja", "chip"); ex.type = "button";
  ex.onclick = function () { inp.value = "https://en.wikipedia.org/wiki/Abuja"; readUrl = inp.value; inp.focus(); };
  chips.appendChild(ex);
  card.appendChild(chips);
  card.appendChild(el("div", "WTA reads one public page at a time. It follows each site's robots.txt, never bypasses logins, CAPTCHAs or paywalls, and cannot read pages that build their content with JavaScript. Each read uses one of your 100 daily page reads.", "hint"));
  col.appendChild(card);

  const out = el("div", undefined, "col"); out.id = "readOut";
  col.appendChild(out);

  const soon = makeCard("Coming next", el("span", "Coming soon", "badge b-yellow"));
  const sd = el("div"); sd.innerHTML = listHtml(p.feats);
  soon.appendChild(sd);
  col.appendChild(soon);

  view.appendChild(col);
  drawRead();
}

function drawRead() {
  const btn = document.getElementById("readBtn");
  if (btn) { btn.disabled = readBusy; btn.textContent = readBusy ? "Reading..." : "Read page"; }
  const out = document.getElementById("readOut");
  if (!out) return;
  out.innerHTML = "";
  if (readBusy) {
    const c = el("div", undefined, "card");
    c.appendChild(emptyBlock("⏳", "Reading the page", "This usually takes a few seconds."));
    out.appendChild(c);
    return;
  }
  if (readError) {
    const c = el("div", undefined, "card");
    c.appendChild(el("div", readError, "errbox"));
    out.appendChild(c);
    return;
  }
  if (!readResult) return;

  const s = readResult.source, p = readResult.page, notes = readResult.notes || [];

  // source
  const c1 = makeCard("Source", el("span", "Shown as data only", "badge b-grey"));
  const kv = el("dl", undefined, "kv");
  kv.innerHTML = '<dt>Address</dt><dd>' + linkHtml(s.final_url) + '</dd>' +
    '<dt>Read at</dt><dd>' + esc(new Date(s.retrieved_at).toLocaleString()) + '</dd>' +
    '<dt>Status</dt><dd>' + esc(s.status) + '</dd>' +
    '<dt>Size</dt><dd>' + esc(Math.max(1, Math.round(s.bytes / 1024))) + ' KB</dd>';
  c1.appendChild(kv);
  c1.appendChild(el("div", "Text from web pages is shown here as plain data. WTA never follows instructions found on a page.", "hint"));
  out.appendChild(c1);

  // page details
  const c2 = makeCard(p.title || "Untitled page");
  if (p.description) { const d = el("p", p.description, "para"); c2.appendChild(d); }
  const rows = [];
  if (p.author) rows.push(["Author", p.author]);
  if (p.published) rows.push(["Published", p.published]);
  if (p.modified) rows.push(["Updated", p.modified]);
  if (p.language) rows.push(["Language", p.language]);
  if (rows.length) {
    const k2 = el("dl", undefined, "kv");
    k2.innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join("");
    c2.appendChild(k2);
  } else {
    c2.appendChild(el("div", "No author or date information was found on this page.", "hint"));
  }
  out.appendChild(c2);

  notes.forEach(function (n) { out.appendChild(el("div", n, "note")); });

  // headings
  if (p.headings && p.headings.length) {
    const c3 = makeCard("Headings (" + p.headings.length + ")");
    p.headings.forEach(function (h) {
      const d = el("div", h.text, "hl");
      d.style.paddingLeft = ((h.level - 1) * 14) + "px";
      if (h.level === 1) d.style.fontWeight = "bold";
      c3.appendChild(d);
    });
    out.appendChild(c3);
  }

  // text
  if (p.text && p.text.length) {
    const c4 = makeCard("Text found (" + p.text.length + (p.text.length === 1 ? " paragraph)" : " paragraphs)"));
    const shown = showAllText ? p.text : p.text.slice(0, 6);
    shown.forEach(function (t) { c4.appendChild(el("p", t, "para")); });
    if (p.text.length > 6) {
      const b = el("button", showAllText ? "Show less" : "Show all " + p.text.length + " paragraphs", "mini");
      b.onclick = function () { showAllText = !showAllText; drawRead(); };
      c4.appendChild(b);
    }
    out.appendChild(c4);
  }

  // tables
  if (p.tables && p.tables.length) {
    p.tables.forEach(function (rowsT, i) {
      const c5 = makeCard("Table " + (i + 1));
      const w = el("div", undefined, "tblwrap");
      w.innerHTML = '<table class="tbl">' + rowsT.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join("") + '</tr>';
      }).join("") + '</table>';
      c5.appendChild(w);
      out.appendChild(c5);
    });
  }

  // contacts
  const ct = p.contacts || { emails: [], phones: [], social: [] };
  const c6 = makeCard("Public contact details");
  if (ct.emails.length || ct.phones.length || ct.social.length) {
    const k3 = el("dl", undefined, "kv");
    let h = "";
    if (ct.emails.length) h += '<dt>Emails</dt><dd>' + ct.emails.map(esc).join("<br>") + '</dd>';
    if (ct.phones.length) h += '<dt>Phones</dt><dd>' + ct.phones.map(esc).join("<br>") + '</dd>';
    if (ct.social.length) h += '<dt>Social</dt><dd>' + ct.social.map(function (u) { return linkHtml(u); }).join("<br>") + '</dd>';
    k3.innerHTML = h;
    c6.appendChild(k3);
    c6.appendChild(el("div", "Only details shown publicly on the page. Check them on the page before using them.", "hint"));
  } else {
    c6.appendChild(el("div", "No public contact details were found on this page.", "hint"));
  }
  out.appendChild(c6);

  // links
  if (p.links && p.links.length) {
    const c7 = makeCard("Links (" + p.links.length + ")");
    const shownL = showAllLinks ? p.links : p.links.slice(0, 15);
    shownL.forEach(function (l) {
      const d = el("div", undefined, "lnk");
      d.innerHTML = linkHtml(l.url, l.text || l.url) + '<small>' + (l.internal ? "Same site" : "Other site") + '</small>';
      c7.appendChild(d);
    });
    if (p.links.length > 15) {
      const b = el("button", showAllLinks ? "Show fewer" : "Show all " + p.links.length + " links", "mini");
      b.onclick = function () { showAllLinks = !showAllLinks; drawRead(); };
      c7.appendChild(b);
    }
    out.appendChild(c7);
  }
}

async function readPage() {
  if (readBusy) return;
  const inp = document.getElementById("readUrl");
  const raw = inp ? inp.value.trim() : "";
  if (!raw) { readError = "Enter a web address to read."; readResult = null; drawRead(); return; }
  readUrl = raw; readBusy = true; readError = ""; readResult = null; showAllText = false; showAllLinks = false;
  drawRead();
  try {
    const token = await getToken();
    const r = await fetch(PAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": SUPABASE_KEY },
      body: JSON.stringify({ url: raw })
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok || !data.page) throw new Error(data.error || "Something went wrong. Please try again.");
    readResult = data;
  } catch (err) {
    readError = err.message || "Something went wrong.";
  }
  readBusy = false;
  drawRead();
}

// ===== TASKS (list on the left, flow on the right) =====
function filteredTasks() {
  return tasks.filter(function (t) {
    if (taskFilter === "active" && !isActive(t)) return false;
    if (taskFilter === "completed" && t.status !== "completed") return false;
    if (taskQuery && (t.title + " " + t.instruction).toLowerCase().indexOf(taskQuery.toLowerCase()) < 0) return false;
    return true;
  });
}
function drawTaskList(box, selId) {
  box.innerHTML = "";
  const list = filteredTasks();
  if (!list.length) { box.appendChild(emptyBlock("🔍", tasks.length ? "No matching tasks" : "No tasks yet", tasks.length ? "Try a different search or filter." : "Plan a task in the AI Workspace and it will be saved here.")); return; }
  list.forEach(function (t) {
    const a = el("a", undefined, "titem" + (t.id === selId ? " sel" : ""));
    a.href = "#task/" + t.id;
    a.innerHTML = '<div class="tt"><b>' + esc(t.title) + '</b>' + badge(t.status) + '</div><div class="meta"><span>' + esc(LEVELS[t.level] || "Research") + '</span><span>' + timeAgo(t.created_at) + '</span></div>';
    box.appendChild(a);
  });
}

function renderTasks(taskId) {
  view.appendChild(el("h2", pages.tasks.icon + " Tasks"));
  view.appendChild(el("p", pages.tasks.desc, "sub"));
  if (!user) { view.appendChild(signInCard("Sign in to see your tasks.")); return; }
  if (!dataLoaded) { view.appendChild(el("p", "Loading...", "sub")); return; }

  const sel = (taskId && tasks.find(function (x) { return x.id === taskId; })) || (!taskId ? tasks[0] : null);
  const split = el("div", undefined, "split" + (taskId ? " has-detail" : ""));

  const lp = el("div", undefined, "listpane");
  const lc = el("div", undefined, "card");
  const head = el("div", undefined, "head-row");
  head.appendChild(el("h3", "All tasks"));
  const nb = el("button", "New task", "btn btn-s");
  nb.onclick = function () { wsTab = "task"; go("workspace"); };
  head.appendChild(nb);
  lc.appendChild(head);
  const q = document.createElement("input");
  q.className = "search"; q.placeholder = "Search tasks"; q.value = taskQuery;
  lc.appendChild(q);
  const fl = el("div", undefined, "tfilter");
  const box = el("div");
  [["all", "All"], ["active", "Active"], ["completed", "Completed"]].forEach(function (f) {
    const b = el("button", f[1], taskFilter === f[0] ? "on" : ""); b.type = "button";
    b.onclick = function () { taskFilter = f[0]; Array.prototype.forEach.call(fl.children, function (x) { x.classList.remove("on"); }); b.classList.add("on"); drawTaskList(box, sel && sel.id); };
    fl.appendChild(b);
  });
  lc.appendChild(fl);
  q.oninput = function () { taskQuery = q.value; drawTaskList(box, sel && sel.id); };
  lc.appendChild(box);
  drawTaskList(box, sel && sel.id);
  lp.appendChild(lc);

  const dp = el("div", undefined, "detailpane");
  const back = el("a", "Back to tasks", "btn btn-o btn-s backlink"); back.href = "#tasks";
  dp.appendChild(back);
  if (!sel) {
    const c = el("div", undefined, "card");
    c.appendChild(emptyBlock(taskId ? "🔍" : "🗺️", taskId ? "Task not found" : "Pick a task", taskId ? "It may have been deleted." : "Its plan and progress will appear here."));
    dp.appendChild(c);
  } else {
    const hc = el("div", undefined, "card");
    hc.style.marginBottom = "16px";
    hc.innerHTML = '<div class="trow-top" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h3 style="font-size:18px;line-height:1.35;overflow-wrap:anywhere">' + esc(sel.title) + '</h3>' + badge(sel.status) + '</div>' +
      '<div class="meta"><span>' + esc(LEVELS[sel.level] || "Research") + '</span><span>Created ' + timeAgo(sel.created_at) + '</span></div>';
    dp.appendChild(hc);

    const fc = makeCard("Task flow");
    const fb = el("div"); fb.innerHTML = flowHtml(sel);
    fc.appendChild(fb);
    if (sel.status === "planned") fc.appendChild(el("div", "Plan ready. Live searching, reading pages and report writing arrive in an upcoming update, so this task stays at the planning stage for now.", "note"));
    dp.appendChild(fc);

    const pc = makeCard("The plan");
    pc.style.marginTop = "16px";
    const pb = el("div"); pb.innerHTML = planHtml(sel.plan);
    pc.appendChild(pb);
    dp.appendChild(pc);

    const del = el("button", "Delete task", "btn btn-r");
    del.style.marginTop = "16px";
    del.onclick = async function () {
      if (!confirm("Delete this task? This cannot be undone.")) return;
      const r = await sb.from("tasks").delete().eq("id", sel.id);
      if (r.error) { alert("Could not delete the task. Please try again."); return; }
      await loadData(); go("tasks");
    };
    dp.appendChild(del);
  }

  split.appendChild(lp); split.appendChild(dp);
  view.appendChild(split);
}

// ===== OTHER SECTIONS =====
function renderPage(id) {
  const p = pages[id];
  const hero = el("div", undefined, "pg-hero");
  hero.appendChild(el("div", p.icon, "pg-ico"));
  const t = el("div");
  t.appendChild(el("h2", p.name));
  t.appendChild(el("p", p.desc));
  const tags = el("div");
  tags.innerHTML = '<span class="badge b-yellow">Coming soon</span> <span class="badge b-grey">' + esc(groupOf(id)) + '</span>';
  t.appendChild(tags);
  hero.appendChild(t);
  view.appendChild(hero);

  view.appendChild(el("h3", "What you will be able to do"));
  view.lastChild.style.marginBottom = "12px";
  const grid = el("div", undefined, "pg-grid");
  p.feats.forEach(function (f) {
    const c = el("div", undefined, "fcard");
    c.appendChild(el("div", "✓", "fico"));
    c.appendChild(el("p", f));
    grid.appendChild(c);
  });
  view.appendChild(grid);

  const rc = makeCard("Available now");
  const rel = el("div", undefined, "related");
  [["workspace", "💬", "AI Workspace", "Plan a task or chat with WTA."], ["research", "🔎", "Web Research", "Read a public page and see its sources."], ["tasks", "✅", "Tasks", "See your saved plans and their progress."]].forEach(function (r) {
    const a = el("a", undefined, "rel"); a.href = "#" + r[0];
    a.innerHTML = '<div class="sico">' + r[1] + '</div><div><b>' + r[2] + '</b><small>' + r[3] + '</small></div>';
    rel.appendChild(a);
  });
  rc.appendChild(rel);
  view.appendChild(rc);
}

// ===== ROUTER =====
function render() {
  let id = location.hash.slice(1) || "dashboard";
  let taskId = null;
  if (id.indexOf("task/") === 0) { taskId = id.slice(5); id = "tasks"; }
  if (!pages[id]) id = "dashboard";
  buildSide(id);
  document.getElementById("crumb").innerHTML = "WTA &nbsp;/&nbsp; <b>" + esc(pages[id].name) + "</b>" + (taskId ? " &nbsp;/&nbsp; Task" : "");
  view.innerHTML = "";
  if (id === "dashboard") renderDashboard();
  else if (id === "workspace") renderWorkspace();
  else if (id === "research") renderResearch();
  else if (id === "tasks") renderTasks(taskId);
  else renderPage(id);
  side.classList.remove("open");
  shade.classList.remove("show");
  window.scrollTo(0, 0);
}

// ===== LOGIN WINDOW =====
const modal = document.getElementById("modal");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
function setMsg(text, kind) { msg.textContent = text; msg.className = "msg " + (kind || ""); }
function setMode(m) {
  mode = m;
  document.getElementById("tabIn").classList.toggle("on", m === "in");
  document.getElementById("tabUp").classList.toggle("on", m === "up");
  submitBtn.textContent = m === "in" ? "Sign in" : "Create account";
  document.getElementById("password").autocomplete = m === "in" ? "current-password" : "new-password";
  setMsg("");
}
function openModal() {
  if (!sb) { alert("Sign in is unavailable right now. Please try again later."); return; }
  setMode("in"); modal.classList.add("show");
}
function closeModal() { modal.classList.remove("show"); }
document.getElementById("tabIn").onclick = function () { setMode("in"); };
document.getElementById("tabUp").onclick = function () { setMode("up"); };
document.getElementById("cancelBtn").onclick = closeModal;
modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

submitBtn.onclick = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (!email || !password) { setMsg("Enter your email and password.", "err"); return; }
  if (mode === "up" && password.length < 8) { setMsg("Password must be at least 8 characters.", "err"); return; }
  submitBtn.disabled = true; setMsg("Please wait...");
  try {
    if (mode === "in") {
      const r = await sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw r.error;
      closeModal();
    } else {
      const r = await sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: location.origin } });
      if (r.error) throw r.error;
      if (r.data.session) closeModal();
      else setMsg("Account created. Check your email and tap the confirmation link, then sign in.", "ok");
    }
  } catch (err) { setMsg(err.message || "Something went wrong.", "err"); }
  submitBtn.disabled = false;
};
async function signOut() { if (sb) await sb.auth.signOut(); }

// ===== START =====
async function setUser(u) {
  user = u; dataLoaded = false;
  if (!u) {
    chat = []; chatBusy = false; tasks = []; approvalList = []; reports = []; reportCount = 0;
    workspace = null; planBusy = false;
    readUrl = ""; readBusy = false; readError = ""; readResult = null;
  }
  renderAuthArea(); render();
  if (u) { await loadWorkspace(); await loadData(); }
  dataLoaded = true;
  render();
}
if (sb) {
  sb.auth.getSession().then(function (r) { setUser(r.data.session ? r.data.session.user : null); });
  sb.auth.onAuthStateChange(function (event, session) {
    const u = session ? session.user : null;
    if ((u && u.id) !== (user && user.id)) setUser(u);
  });
}
document.getElementById("menuBtn").onclick = function () { side.classList.toggle("open"); shade.classList.toggle("show"); };
shade.onclick = function () { side.classList.remove("open"); shade.classList.remove("show"); };
window.addEventListener("hashchange", render);
renderAuthArea();
render();
