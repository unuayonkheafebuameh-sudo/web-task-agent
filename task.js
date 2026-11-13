// ===== TASKS: run a task from start to finish (loads after research.js) =====
let sources = [], taskPages = [], reportCache = {}, runState = {}, showAllSources = {}, autoRun = null;
const QUERY_CAP = { 1: 2, 2: 4, 3: 6, 4: 6 };
const PAGE_CAP = { 1: 3, 2: 6, 3: 8, 4: 8 };

STEPS[4] = "Cross-check the sources";

const taskStyle = document.createElement("style");
taskStyle.textContent = [
  ".cite{color:var(--orange-d);font-size:11px;margin-left:1px}",
  ".rep h3{font-size:17px;margin:18px 0 6px}",
  ".rep h4{font-size:15px;margin:14px 0 4px}",
  ".rep .ref{font-size:13px;color:#4b5563}",
  ".rep a{color:var(--orange-d);text-decoration:underline}",
  ".trk li.w .dot{border-color:var(--orange);color:var(--orange)}",
  ".rbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}"
].join("");
document.head.appendChild(taskStyle);

// ----- small helpers -----
function sourcesFor(id) { return sources.filter(function (s) { return s.task_id === id; }); }
function pagesFor(id) { return taskPages.filter(function (p) { return p.task_id === id; }); }
function pagesOkFor(id) { return pagesFor(id).filter(function (p) { return p.status === "ok"; }).length; }
function pagesFailedFor(id) { return pagesFor(id).filter(function (p) { return p.status === "failed"; }).length; }
function keepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }

async function loadSources() {
  sources = [];
  if (!sb || !user) return;
  const r = await sb.from("task_sources")
    .select("id,task_id,query,title,url,snippet,authors,published,venue,doi,destination,retrieved_at")
    .order("retrieved_at", { ascending: false }).limit(1000);
  if (!r.error && r.data) sources = r.data;
}
async function loadPages() {
  taskPages = [];
  if (!sb || !user) return;
  const r = await sb.from("task_pages")
    .select("task_id,requested_url,final_url,title,status,error,retrieved_at")
    .order("retrieved_at", { ascending: false }).limit(1000);
  if (!r.error && r.data) taskPages = r.data;
}
async function loadReport(taskId) {
  if (!sb || !user) return;
  const r = await sb.from("reports").select("id,title,body,created_at")
    .eq("task_id", taskId).order("created_at", { ascending: false }).limit(1);
  reportCache[taskId] = (!r.error && r.data && r.data.length) ? r.data[0] : null;
  paintReport(taskId);
}
async function callFn(payload) {
  const token = await getToken();
  const r = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": SUPABASE_KEY },
    body: JSON.stringify(payload)
  });
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
  return d;
}

// ----- hook into the app -----
const _loadData = loadData;
loadData = async function () { await _loadData(); await loadSources(); await loadPages(); };

const _setUser = setUser;
setUser = async function (u) {
  if (!u) { sources = []; taskPages = []; reportCache = {}; runState = {}; showAllSources = {}; autoRun = null; }
  return _setUser(u);
};

stepsDone = function (t) {
  if (t.status === "completed") return 6;
  return 2 + (sourcesFor(t.id).length ? 1 : 0) + (pagesOkFor(t.id) ? 1 : 0);
};

flowHtml = function (t) {
  const done = stepsDone(t), p = t.plan || {};
  const nSrc = sourcesFor(t.id).length, nOk = pagesOkFor(t.id);
  let h = '<div class="flow">';
  h += nodeHtml("📝", "Your request", t.instruction.length > 140 ? t.instruction.slice(0, 140) + "..." : t.instruction, "d");
  STEPS.forEach(function (s, i) {
    const d = i < done;
    let sub = "Not started";
    if (d && i === 0) sub = p.objective || "Request understood";
    if (d && i === 1) sub = (p.queries ? p.queries.length : 0) + " search queries, " + (LEVELS[p.recommended_level] || "research").toLowerCase();
    if (d && i === 2) sub = nSrc + (nSrc === 1 ? " source saved" : " sources saved");
    if (d && i === 3) sub = nOk + (nOk === 1 ? " page read" : " pages read");
    if (d && i === 4) sub = "Compared in the report";
    if (d && i === 5) sub = "Report ready";
    h += '<div class="conn ' + (d ? "d" : "") + '"></div>' + nodeHtml(STEP_ICONS[i], s, sub, d ? "d" : "n");
  });
  const fin = t.status === "completed";
  h += '<div class="conn ' + (fin ? "d" : "") + '"></div>' + nodeHtml("🏁", "Task completed", fin ? "Result delivered" : "Not finished", fin ? "d" : "n");
  return h + '</div>';
};

// ----- run a task end to end -----
function paintRun(taskId) {
  const c = document.getElementById("runCard");
  if (c && c.dataset.task === taskId) fillRun(c, taskId);
}
function paintReport(taskId) {
  const c = document.getElementById("repCard");
  if (c && c.dataset.task === taskId) fillReport(c, taskId);
}
function paintSources(taskId) {
  const c = document.getElementById("srcCard");
  if (c && c.dataset.task === taskId) fillSources(c, taskId);
}

async function runFull(taskId, again) {
  const cur = runState[taskId];
  if (cur && cur.active) return;
  const st = runState[taskId] = {
    active: true, stop: false, stage: "search", error: "", note: "",
    sourcesN: sourcesFor(taskId).length, ok: pagesOkFor(taskId), failed: pagesFailedFor(taskId), cap: 0
  };
  paintRun(taskId);
  try {
    // 1. search
    if (again || !sourcesFor(taskId).length) {
      st.stage = "search"; paintRun(taskId);
      const s = await callFn({ task_id: taskId });
      await loadSources();
      st.sourcesN = sourcesFor(taskId).length;
      if (s.failed_destinations && s.failed_destinations.length) {
        st.note = "These sources did not answer: " + s.failed_destinations.map(function (d) { return DEST_LABEL[d] || d; }).join(", ") + ".";
      }
      if (!st.sourcesN) throw new Error("The searches found no sources. Try rewording the task.");
      paintRun(taskId); paintSources(taskId);
    }
    // 2. read pages
    if (!st.stop) {
      st.stage = "read"; paintRun(taskId);
      for (let i = 0; i < 8; i++) {
        if (st.stop) break;
        const d = await callFn({ task_id: taskId, action: "read" });
        st.ok = d.ok_count; st.failed = d.failed_count; st.cap = d.cap;
        if (d.limit) st.note = "The daily page-reading limit was reached.";
        paintRun(taskId);
        if (d.done) break;
      }
    }
    if (st.stop) {
      try { await callFn({ task_id: taskId, action: "mark", status: "paused" }); } catch (e) {}
      st.note = "Paused. Tap Continue to pick up where it stopped.";
    } else {
      if (!st.ok) throw new Error("None of the pages could be read, so there is nothing to base a report on. Many publisher sites refuse automated readers. You can read pages by hand on Web Research.");
      // 3. write the report
      st.stage = "report"; paintRun(taskId);
      await callFn({ task_id: taskId, action: "report" });
      st.stage = "done";
    }
  } catch (err) {
    st.error = err.message || "Something went wrong.";
    try { await callFn({ task_id: taskId, action: "mark", status: "failed" }); } catch (e) {}
  }
  st.active = false;
  try { await loadData(); await loadReport(taskId); } catch (e) {}
  keepScroll();
}

function fillRun(c, taskId) {
  const st = runState[taskId] || {};
  const t = tasks.find(function (x) { return x.id === taskId; });
  const active = !!st.active;
  const nSrc = active ? st.sourcesN : sourcesFor(taskId).length;
  const nOk = active ? st.ok : pagesOkFor(taskId);
  const nBad = active ? st.failed : pagesFailedFor(taskId);
  const hasReport = !!reportCache[taskId];
  c.dataset.task = taskId;
  c.innerHTML = "";

  const head = el("div", undefined, "head-row");
  head.appendChild(el("h3", "Run this task"));
  let label;
  if (active) label = st.stop ? "Stopping..." : "Stop";
  else if (hasReport) label = "Run again";
  else if (t && (t.status === "running" || t.status === "paused" || t.status === "failed")) label = "Continue";
  else label = "Run task";
  const b = el("button", label, active ? "btn btn-r btn-s" : "btn btn-s");
  b.disabled = active && !!st.stop;
  b.onclick = function () {
    if (active) { st.stop = true; paintRun(taskId); }
    else runFull(taskId, hasReport);
  };
  head.appendChild(b);
  c.appendChild(head);

  const stages = [
    ["Search sources", "search", nSrc > 0, nSrc ? nSrc + (nSrc === 1 ? " source saved" : " sources saved") : "Not started"],
    ["Read pages", "read", nOk + nBad > 0, (nOk + nBad) ? nOk + " read, " + nBad + " could not be read" : "Not started"],
    ["Write the report", "report", hasReport, hasReport ? "Ready" : "Not started"]
  ];
  const ol = el("ol", undefined, "trk");
  stages.forEach(function (s) {
    const working = active && st.stage === s[1];
    const li = el("li", undefined, working ? "w" : (s[2] ? "d" : ""));
    li.appendChild(el("span", working ? "…" : (s[2] ? "✓" : ""), "dot"));
    li.appendChild(el("span", s[0]));
    li.appendChild(el("em", working ? "Working..." : s[3]));
    ol.appendChild(li);
  });
  c.appendChild(ol);

  if (st.error) { const e = el("div", st.error, "errbox"); e.style.marginTop = "12px"; c.appendChild(e); }
  if (st.note) c.appendChild(el("div", st.note, "note"));
  if (!active && t && t.status === "running" && !st.error) {
    c.appendChild(el("div", "A previous run was interrupted. Tap Continue to pick it up.", "note"));
  }
  if (active) c.appendChild(el("div", "WTA is working. Keep this page open until it finishes.", "hint"));
  const lv = t ? t.level : 2;
  c.appendChild(el("div", "A run uses up to " + (QUERY_CAP[lv] || 4) + " searches, " + (PAGE_CAP[lv] || 6) + " page reads and 1 AI message from your daily limits. Only pages that were actually read are used in the report.", "hint"));
}

// ----- report card -----
function mdToHtml(md) {
  const inline = function (s, noCite) {
    let h = esc(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    if (!noCite) h = h.replace(/\[(\d{1,2})\]/g, '<sup class="cite">[$1]</sup>');
    h = h.replace(/(https?:\/\/[^\s<]+)/g, function (m) {
      const t = m.replace(/[.,;:!?)]+$/, "");
      return '<a href="' + t + '" target="_blank" rel="noopener noreferrer nofollow">' + t + '</a>' + m.slice(t.length);
    });
    return h;
  };
  let html = "", list = false;
  const close = function () { if (list) { html += "</ul>"; list = false; } };
  String(md || "").split(/\r?\n/).forEach(function (ln) {
    const t = ln.trim();
    if (!t) { close(); return; }
    let m;
    if ((m = t.match(/^(#{1,3})\s+(.*)$/))) {
      close();
      const lv = Math.min(m[1].length + 1, 4);
      html += "<h" + lv + ">" + inline(m[2]) + "</h" + lv + ">";
    } else if ((m = t.match(/^[-*]\s+(.*)$/))) {
      if (!list) { html += '<ul class="feat">'; list = true; }
      html += "<li>" + inline(m[1]) + "</li>";
    } else if (/^\[\d{1,2}\]/.test(t)) {
      close(); html += '<p class="para ref">' + inline(t, true) + "</p>";
    } else {
      close(); html += '<p class="para">' + inline(t) + "</p>";
    }
  });
  close();
  return html;
}

function fillReport(c, taskId) {
  const rep = reportCache[taskId];
  c.dataset.task = taskId;
  c.innerHTML = "";
  const head = el("div", undefined, "head-row");
  head.appendChild(el("h3", "Report"));
  if (rep) head.appendChild(el("span", "Written by AI", "badge b-grey"));
  c.appendChild(head);
  if (!rep) {
    c.appendChild(emptyBlock("📄", "No report yet", "Tap Run task above. WTA will search, read the pages and write a cited report here."));
    return;
  }
  c.appendChild(el("h3", rep.title));
  c.lastChild.style.cssText = "font-size:19px;line-height:1.35;overflow-wrap:anywhere;margin-bottom:4px";
  c.appendChild(el("div", "Written " + new Date(rep.created_at).toLocaleString(), "hint"));
  c.lastChild.style.margin = "0 0 8px";

  const bar = el("div", undefined, "rbar");
  const full = rep.title + "\n\n" + rep.body;
  const cp = el("button", "Copy report", "btn btn-o btn-s");
  cp.onclick = function () {
    if (navigator.clipboard) navigator.clipboard.writeText(full).then(function () { cp.textContent = "Copied"; }, function () { alert("Could not copy. Try Download instead."); });
    else alert("Copying is not available here. Try Download instead.");
  };
  const dl = el("button", "Download", "btn btn-o btn-s");
  dl.onclick = function () {
    const blob = new Blob([full], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wta-report.md";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };
  bar.appendChild(cp); bar.appendChild(dl);
  c.appendChild(bar);

  const body = el("div", undefined, "rep");
  body.innerHTML = mdToHtml(rep.body);
  c.appendChild(body);
}

// ----- sources card -----
function fillSources(c, taskId) {
  const list = sourcesFor(taskId);
  const pm = {};
  pagesFor(taskId).forEach(function (p) { pm[p.requested_url] = p; });
  c.dataset.task = taskId;
  c.innerHTML = "";
  const head = el("div", undefined, "head-row");
  head.appendChild(el("h3", "Sources (" + list.length + ")"));
  c.appendChild(head);
  if (!list.length) {
    c.appendChild(emptyBlock("🔎", "No sources yet", "They appear here when the task runs its searches."));
    return;
  }
  c.appendChild(el("div", "Titles and snippets come from the source sites and are shown as data only.", "hint"));
  const shown = showAllSources[taskId] ? list : list.slice(0, 10);
  shown.forEach(function (x) {
    const d = el("div", undefined, "rcard");
    const top = el("div", undefined, "rtop");
    const t = el("div");
    t.innerHTML = linkHtml(x.url, x.title).replace("<a ", '<a class="rtitle" ');
    top.appendChild(t);
    top.appendChild(el("span", DEST_LABEL[x.destination] || x.destination, "badge b-grey"));
    d.appendChild(top);

    let m = "";
    const au = Array.isArray(x.authors) ? x.authors : [];
    if (au.length) m += "<span>" + esc(au.slice(0, 4).join(", ")) + (au.length > 4 ? " and others" : "") + "</span>";
    if (x.published) m += "<span>" + (x.destination === "wikipedia" ? "Last edited " + esc(String(x.published).slice(0, 10)) : "Published " + esc(x.published)) + "</span>";
    if (x.venue && x.destination !== "wikipedia") m += "<span>" + esc(x.venue) + "</span>";
    if (x.doi) m += "<span>DOI " + esc(x.doi) + "</span>";
    if (m) { const meta = el("div", undefined, "rmeta"); meta.innerHTML = m; d.appendChild(meta); }

    const pg = pm[x.url];
    if (pg) {
      const s = el("div");
      s.style.marginTop = "6px";
      s.innerHTML = pg.status === "ok"
        ? '<span class="badge b-green">Read and used</span>'
        : '<span class="badge b-yellow">Could not read</span> <span class="hint">' + esc(pg.error || "") + '</span>';
      d.appendChild(s);
    }
    if (x.snippet) d.appendChild(el("p", x.snippet, "rsnip"));
    const f = el("div", "Found by the search: " + x.query + ". Retrieved " + new Date(x.retrieved_at).toLocaleString(), "hint");
    f.style.margin = "6px 0 0";
    d.appendChild(f);

    const act = el("div", undefined, "ract");
    const rb = el("button", "Read this page", "btn btn-o btn-s");
    rb.type = "button";
    rb.onclick = function () { readUrl = x.url; go("research"); setTimeout(readPage, 200); };
    act.appendChild(rb);
    d.appendChild(act);
    c.appendChild(d);
  });
  if (list.length > 10) {
    const more = el("button", showAllSources[taskId] ? "Show fewer" : "Show all " + list.length + " sources", "mini");
    more.onclick = function () { showAllSources[taskId] = !showAllSources[taskId]; paintSources(taskId); };
    c.appendChild(more);
  }
}

// ----- add the new cards to the task page -----
const _renderTasks = renderTasks;
renderTasks = function (taskId) {
  _renderTasks(taskId);
  const dp = view.querySelector(".detailpane");
  if (!dp || !user || !dataLoaded) return;
  const sel = (taskId && tasks.find(function (x) { return x.id === taskId; })) || (!taskId ? tasks[0] : null);
  if (!sel) return;

  const flowCard = Array.prototype.slice.call(dp.children).find(function (c) {
    const h = c.querySelector("h3");
    return h && h.textContent === "Task flow";
  });

  const runCard = el("div", undefined, "card"); runCard.id = "runCard"; runCard.style.marginTop = "16px";
  const repCard = el("div", undefined, "card"); repCard.id = "repCard"; repCard.style.marginTop = "16px";
  const srcCard = el("div", undefined, "card"); srcCard.id = "srcCard"; srcCard.style.marginTop = "16px";
  let anchor = flowCard;
  [runCard, repCard, srcCard].forEach(function (card) {
    if (anchor) dp.insertBefore(card, anchor.nextSibling); else dp.appendChild(card);
    anchor = card;
  });
  fillRun(runCard, sel.id);
  fillReport(repCard, sel.id);
  fillSources(srcCard, sel.id);

  const note = flowCard ? flowCard.querySelector(".note") : null;
  if (note) note.remove();

  if (!Object.prototype.hasOwnProperty.call(reportCache, sel.id)) loadReport(sel.id);
  if (autoRun === sel.id) { autoRun = null; runFull(sel.id, false); }
};

// a new task starts running as soon as it has been planned
const _planTask = planTask;
planTask = async function () {
  const before = new Set(tasks.map(function (t) { return t.id; }));
  await _planTask();
  const fresh = tasks.find(function (t) { return !before.has(t.id); });
  if (fresh) autoRun = fresh.id;
};