// ===== SETTINGS =====
const SUPABASE_URL = "https://lgbtckexyubvhskgljzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_iBVXrI8v9e8dUtT6wF51jw_8iycTB-8";
const CHAT_URL = SUPABASE_URL + "/functions/v1/rapid-endpoint";
const PLAN_URL = SUPABASE_URL + "/functions/v1/quick-service";

let sb = null;
try { sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { sb = null; }

// ===== STATE =====
let user = null, workspace = null, mode = "in";
let tasks = [], approvalList = [], reports = [], reportCount = 0, dataLoaded = false;
let chat = [], chatBusy = false, wsTab = "task", draft = "", planBusy = false;
const openG = { "Platform": true };

const LEVELS = { 1: "Quick search", 2: "Standard research", 3: "Deep research", 4: "Extensive research" };
const STEPS = ["Understand the request", "Plan the searches", "Search the web", "Read and extract from pages", "Verify the sources", "Write the report"];
const STATUS = {
  planned: ["Plan ready", "b-orange"], running: ["Running", "b-yellow"], paused: ["Paused", "b-grey"],
  completed: ["Completed", "b-green"], failed: ["Failed", "b-red"], cancelled: ["Cancelled", "b-grey"]
};

// ===== PAGES =====
const pages = {};
function P(id, icon, name, desc, feats) { pages[id] = { icon: icon, name: name, desc: desc, feats: feats }; return id; }

const groups = [
 { label: "Platform", items: [
  P("dashboard", "🏠", "Overview", "Your agent activity at a glance.", []),
  P("workspace", "💬", "AI Workspace", "Give WTA a task. It plans the work and shows its progress.", []),
  P("research", "🔎", "Web Research", "Search the web, read pages and collect sourced findings.", ["Plan several searches and open real pages", "Extract text with source links and dates", "Cross-check claims and flag conflicts"]),
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
  side.scrollTop = keep;
}

// ===== HEADER =====
function renderAuthArea() {
  const area = document.getElementById("authArea");
  area.innerHTML = "";
  if (user) {
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

// ===== TASK PIECES =====
function taskRow(t) {
  const a = el("a", undefined, "trow");
  a.href = "#task/" + t.id;
  const done = stepsDone(t);
  a.innerHTML =
    '<div class="trow-top"><b>' + esc(t.title) + '</b>' + badge(t.status) + '</div>' +
    '<div class="meta"><span>' + esc(LEVELS[t.level] || "Research") + '</span><span>' + timeAgo(t.created_at) + '</span></div>' +
    '<div class="prog"><i style="width:' + Math.round(done / 6 * 100) + '%"></i></div>' +
    '<div class="meta"><span>' + (t.status === "completed" ? "All steps done" : "Plan ready: " + done + " of 6 steps") + '</span></div>';
  return a;
}
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
function stepsHtml(done) {
  return '<ol class="trk">' + STEPS.map(function (s, i) {
    const d = i < done;
    return '<li class="' + (d ? "d" : "") + '"><span class="dot">' + (d ? "✓" : "") + '</span><span>' + s + '</span><em>' + (d ? "Done" : "Not started") + '</em></li>';
  }).join("") + '</ol>';
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
}
async function decide(id, status) {
  const r = await sb.from("approvals").update({ status: status }).eq("id", id);
  if (!r.error) { await loadData(); render(); }
}

// ===== DASHBOARD =====
function statCard(icon, num, label) {
  return '<div class="card stat"><div class="sico">' + icon + '</div><div><div class="num">' + num + '</div><div class="label">' + label + '</div></div></div>';
}
function renderDashboard() {
  const name = user ? user.email.split("@")[0] : "";
  const hero = el("div", undefined, "hero");
  hero.appendChild(el("h2", user ? "Good to see you, " + name : "Give WTA a task"));
  hero.appendChild(el("p", user
    ? "Describe the work. WTA plans it step by step and shows you the plan first."
    : "Describe the work and WTA plans it step by step. Sign in to save your tasks."));
  const ta = document.createElement("textarea");
  ta.className = "hero-ta";
  ta.placeholder = "For example: Compare five recent developments in AI";
  ta.maxLength = 2000;
  ta.value = draft;
  ta.oninput = function () { draft = ta.value; };
  hero.appendChild(ta);
  const acts = el("div", undefined, "acts");
  const b = el("button", user ? "Plan this task" : "Sign in to start", "btn");
  b.onclick = function () {
    if (!user) { openModal(); return; }
    if (!draft.trim()) { ta.focus(); return; }
    wsTab = "task"; go("workspace");
  };
  acts.appendChild(b);
  hero.appendChild(acts);
  view.appendChild(hero);

  const active = tasks.filter(function (t) { return ["planned", "running", "paused"].indexOf(t.status) >= 0; });
  const done = tasks.filter(function (t) { return t.status === "completed"; });
  const stats = el("div", undefined, "stats");
  stats.innerHTML = statCard("⚡", active.length, "Active tasks") + statCard("✅", done.length, "Completed workflows") +
    statCard("🔔", approvalList.length, "Pending approvals") + statCard("📄", reportCount, "Reports");
  view.appendChild(stats);

  const cols = el("div", undefined, "cols");
  const left = el("div"), right = el("div");

  const c1 = makeCard("Active agent tasks");
  if (active.length) active.slice(0, 5).forEach(function (t) { c1.appendChild(taskRow(t)); });
  else c1.appendChild(emptyBlock("⚡", "No active tasks", "Describe a task above and its plan and progress will appear here."));
  left.appendChild(c1);

  const c2 = makeCard("Completed workflows");
  if (done.length) done.slice(0, 3).forEach(function (t) { c2.appendChild(taskRow(t)); });
  else c2.appendChild(emptyBlock("✅", "Nothing completed yet", "Finished tasks will be listed here."));
  left.appendChild(c2);

  const c3 = makeCard("Pending approvals");
  if (approvalList.length) {
    approvalList.slice(0, 5).forEach(function (a) {
      const d = el("div", undefined, "arow");
      d.innerHTML = '<b>' + esc(a.action) + '</b><div class="meta"><span>' + esc(a.details || "") + '</span></div>';
      const r = el("div", undefined, "acts");
      const ok = el("button", "Approve", "btn btn-s"); ok.onclick = function () { decide(a.id, "approved"); };
      const no = el("button", "Reject", "btn btn-r btn-s"); no.onclick = function () { decide(a.id, "rejected"); };
      r.appendChild(ok); r.appendChild(no); d.appendChild(r);
      c3.appendChild(d);
    });
  } else c3.appendChild(emptyBlock("🔔", "Nothing needs your approval", "WTA will ask here before it takes any consequential action."));
  right.appendChild(c3);

  const c4 = makeCard("Recent reports");
  if (reports.length) {
    reports.forEach(function (r) {
      const d = el("div", undefined, "arow");
      d.innerHTML = '<b>' + esc(r.title) + '</b><div class="meta"><span>' + timeAgo(r.created_at) + '</span></div>';
      c4.appendChild(d);
    });
  } else c4.appendChild(emptyBlock("📄", "No reports yet", "Reports WTA writes for you will appear here."));
  right.appendChild(c4);

  cols.appendChild(left); cols.appendChild(right);
  view.appendChild(cols);
}

// ===== AI WORKSPACE =====
function signInCard(text) {
  const card = el("div", undefined, "card");
  card.appendChild(emptyBlock("🔒", "Sign in to continue", text));
  const w = el("div"); w.style.textAlign = "center";
  const b = el("button", "Sign in", "btn"); b.onclick = openModal;
  w.appendChild(b); card.appendChild(w);
  return card;
}
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

// ===== TASKS =====
function renderTasks() {
  const p = pages.tasks;
  view.appendChild(el("h2", p.icon + " " + p.name));
  view.appendChild(el("p", p.desc, "sub"));
  if (!user) { view.appendChild(signInCard("Sign in to see your tasks.")); return; }
  const nb = el("button", "New task", "btn");
  nb.onclick = function () { wsTab = "task"; go("workspace"); };
  const card = makeCard("All tasks", nb);
  if (!dataLoaded) card.appendChild(el("p", "Loading...", "sub"));
  else if (tasks.length) tasks.forEach(function (t) { card.appendChild(taskRow(t)); });
  else card.appendChild(emptyBlock("✅", "No tasks yet", "Give WTA a task in the AI Workspace and it will be saved here."));
  view.appendChild(card);
}

function renderTask(id) {
  const back = el("a", "Back to tasks", "btn btn-o btn-s");
  back.href = "#tasks"; back.style.marginBottom = "14px";
  view.appendChild(back);
  if (!user) { view.appendChild(signInCard("Sign in to see this task.")); return; }
  if (!dataLoaded) { view.appendChild(el("p", "Loading...", "sub")); return; }
  const t = tasks.find(function (x) { return x.id === id; });
  if (!t) { view.appendChild(emptyBlock("🔍", "Task not found", "It may have been deleted.")); return; }

  view.appendChild(el("h2", t.title));
  const meta = el("div", undefined, "meta");
  meta.style.marginBottom = "14px";
  meta.innerHTML = badge(t.status) + '<span>' + esc(LEVELS[t.level] || "Research") + '</span><span>Created ' + timeAgo(t.created_at) + '</span>';
  view.appendChild(meta);

  const c1 = makeCard("Your instruction");
  c1.appendChild(el("p", t.instruction));
  c1.lastChild.style.cssText = "margin:0;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere";
  view.appendChild(c1);

  const c2 = makeCard("Progress");
  const stepsBox = el("div"); stepsBox.innerHTML = stepsHtml(stepsDone(t));
  c2.appendChild(stepsBox);
  if (t.status === "planned") c2.appendChild(el("div", "Plan ready. Live searching, reading pages and report writing arrive in an upcoming update, so this task stays at the planning stage for now.", "note"));
  view.appendChild(c2);

  const c3 = makeCard("The plan");
  const pb = el("div"); pb.innerHTML = planHtml(t.plan);
  c3.appendChild(pb);
  view.appendChild(c3);

  const del = el("button", "Delete task", "btn btn-r");
  del.onclick = async function () {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    const r = await sb.from("tasks").delete().eq("id", t.id);
    if (r.error) { alert("Could not delete the task. Please try again."); return; }
    await loadData(); go("tasks");
  };
  view.appendChild(del);
}

// ===== GENERIC PAGE =====
function renderPage(id) {
  const p = pages[id];
  view.appendChild(el("h2", p.icon + " " + p.name));
  view.appendChild(el("p", p.desc, "sub"));
  const tag = el("span", "Coming soon", "badge b-yellow");
  const c = makeCard("What you will be able to do", tag);
  const d = el("div"); d.innerHTML = listHtml(p.feats);
  c.appendChild(d);
  view.appendChild(c);
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
  else if (id === "tasks") { if (taskId) renderTask(taskId); else renderTasks(); }
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
  if (!u) { chat = []; chatBusy = false; tasks = []; approvalList = []; reports = []; reportCount = 0; workspace = null; planBusy = false; }
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
render();2
