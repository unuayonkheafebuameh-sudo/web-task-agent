// ===== WEB RESEARCH: search + read (loads after app.js) =====
const SEARCH_URL = SUPABASE_URL + "/functions/v1/super-handler";

const researchStyle = document.createElement("style");
researchStyle.textContent = [
  ".dchips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 4px}",
  ".dchip{border:1px solid var(--line);background:#fff;border-radius:16px;padding:7px 12px;font-size:13px;cursor:pointer}",
  ".dchip.on{background:var(--orange-l);border-color:var(--orange);color:var(--orange-d);font-weight:bold}",
  ".dstat{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}",
  ".rcard{padding:12px 0;border-bottom:1px solid #f0f0f0}",
  ".rcard:last-child{border-bottom:0}",
  ".rtop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}",
  ".rtitle{font-size:15px;font-weight:bold;line-height:1.35;overflow-wrap:anywhere;color:var(--orange-d);text-decoration:underline}",
  ".rmeta{display:flex;gap:6px 12px;flex-wrap:wrap;color:var(--muted);font-size:12.5px;margin-top:5px}",
  ".rsnip{margin:6px 0 0;font-size:13.5px;line-height:1.45;color:#4b5563;overflow-wrap:anywhere}",
  ".ract{margin-top:8px}"
].join("");
document.head.appendChild(researchStyle);

const DEST_LABEL = { wikipedia: "Wikipedia", openalex: "OpenAlex", crossref: "Crossref" };
let searchQuery = "", searchBusy = false, searchError = "", searchResult = null, searchOwner = null, searchShowAll = false;
const searchDest = { wikipedia: true, openalex: true, crossref: true };

function renderResearch() {
  const p = pages.research;
  view.appendChild(el("h2", p.icon + " " + p.name));
  view.appendChild(el("p", "Search trusted sources, then read any result to see exactly what it says, with its source and time.", "sub"));
  if (!user) { view.appendChild(signInCard("Sign in to search and read with WTA.")); return; }
  if (searchOwner !== user.id) { searchOwner = user.id; searchResult = null; searchError = ""; searchQuery = ""; searchShowAll = false; }

  const col = el("div", undefined, "col");

  // ----- search card -----
  const sc = el("div", undefined, "card");
  sc.appendChild(el("h3", "Search"));
  const row = el("div", undefined, "urlrow");
  row.style.marginTop = "10px";
  const q = document.createElement("input");
  q.id = "searchQ"; q.type = "search"; q.placeholder = "What do you want to find?"; q.maxLength = 300;
  q.value = searchQuery;
  q.oninput = function () { searchQuery = q.value; };
  q.addEventListener("keydown", function (e) { if (e.key === "Enter") runSearch(); });
  const go1 = el("button", searchBusy ? "Searching..." : "Search", "btn");
  go1.id = "searchBtn"; go1.disabled = searchBusy; go1.onclick = runSearch;
  row.appendChild(q); row.appendChild(go1);
  sc.appendChild(row);

  const dchips = el("div", undefined, "dchips");
  Object.keys(DEST_LABEL).forEach(function (k) {
    const b = el("button", DEST_LABEL[k], "dchip" + (searchDest[k] ? " on" : ""));
    b.type = "button";
    b.onclick = function () {
      const on = Object.keys(searchDest).filter(function (x) { return searchDest[x]; });
      if (searchDest[k] && on.length === 1) return;
      searchDest[k] = !searchDest[k];
      b.classList.toggle("on", searchDest[k]);
    };
    dchips.appendChild(b);
  });
  sc.appendChild(dchips);
  sc.appendChild(el("div", "WTA searches Wikipedia for general topics, and the OpenAlex and Crossref databases for scholarly work. This is not a search of the whole web. Each search uses one of your 60 daily searches.", "hint"));
  col.appendChild(sc);

  const sOut = el("div", undefined, "col"); sOut.id = "searchOut";
  col.appendChild(sOut);

  // ----- read card -----
  const rc = el("div", undefined, "card"); rc.id = "readCard";
  rc.appendChild(el("h3", "Read a web page"));
  const row2 = el("div", undefined, "urlrow");
  row2.style.marginTop = "10px";
  const inp = document.createElement("input");
  inp.id = "readUrl"; inp.type = "url"; inp.placeholder = "example.com/page"; inp.maxLength = 2000;
  inp.setAttribute("autocapitalize", "none"); inp.setAttribute("autocorrect", "off");
  inp.value = readUrl;
  inp.oninput = function () { readUrl = inp.value; };
  inp.addEventListener("keydown", function (e) { if (e.key === "Enter") readPage(); });
  const btn = el("button", readBusy ? "Reading..." : "Read page", "btn");
  btn.id = "readBtn"; btn.disabled = readBusy; btn.onclick = readPage;
  row2.appendChild(inp); row2.appendChild(btn);
  rc.appendChild(row2);
  rc.appendChild(el("div", "WTA reads one public page at a time. It follows each site's robots.txt, never bypasses logins, CAPTCHAs or paywalls, and cannot read pages that build their content with JavaScript. Each read uses one of your 100 daily page reads.", "hint"));
  col.appendChild(rc);

  const out = el("div", undefined, "col"); out.id = "readOut";
  col.appendChild(out);

  const soon = makeCard("Coming next", el("span", "Coming soon", "badge b-yellow"));
  const sd = el("div"); sd.innerHTML = listHtml(["Save sources to a task", "Follow links across a site", "Cross-check claims and write a report"]);
  soon.appendChild(sd);
  col.appendChild(soon);

  view.appendChild(col);
  drawSearch();
  drawRead();
}

function drawSearch() {
  const btn = document.getElementById("searchBtn");
  if (btn) { btn.disabled = searchBusy; btn.textContent = searchBusy ? "Searching..." : "Search"; }
  const out = document.getElementById("searchOut");
  if (!out) return;
  out.innerHTML = "";

  if (searchBusy) {
    const c = el("div", undefined, "card");
    c.appendChild(emptyBlock("⏳", "Searching", "This usually takes a few seconds."));
    out.appendChild(c);
    return;
  }
  if (searchError) {
    const c = el("div", undefined, "card");
    c.appendChild(el("div", searchError, "errbox"));
    out.appendChild(c);
    return;
  }
  if (!searchResult) return;

  const total = searchResult.results.length;
  const c = makeCard("Results (" + total + ")", el("span", "Shown as data only", "badge b-grey"));
  c.appendChild(el("div", "Searched " + new Date(searchResult.searched_at).toLocaleString() + " for: " + searchResult.query, "hint"));
  c.lastChild.style.margin = "0 0 10px";

  const st = el("div", undefined, "dstat");
  st.innerHTML = searchResult.destinations.map(function (d) {
    return '<span class="badge ' + (d.ok ? (d.count ? "b-green" : "b-grey") : "b-red") + '">' +
      esc(DEST_LABEL[d.name] || d.name) + ": " + (d.ok ? d.count + (d.count === 1 ? " result" : " results") : "did not answer") + '</span>';
  }).join("");
  c.appendChild(st);

  if (!total) {
    c.appendChild(emptyBlock("🔍", "No results", "Try different words, or turn on more sources."));
    out.appendChild(c);
    return;
  }

  const shown = searchShowAll ? searchResult.results : searchResult.results.slice(0, 10);
  shown.forEach(function (x) {
    const d = el("div", undefined, "rcard");
    const top = el("div", undefined, "rtop");
    const t = el("div");
    t.innerHTML = linkHtml(x.url, x.title).replace("<a ", '<a class="rtitle" ');
    top.appendChild(t);
    top.appendChild(el("span", DEST_LABEL[x.destination] || x.destination, "badge b-grey"));
    d.appendChild(top);

    const meta = el("div", undefined, "rmeta");
    let m = "";
    if (x.authors && x.authors.length) m += "<span>" + esc(x.authors.slice(0, 4).join(", ")) + (x.authors.length > 4 ? " and others" : "") + "</span>";
    if (x.date) m += "<span>" + (x.destination === "wikipedia" ? "Last edited " + esc(String(x.date).slice(0, 10)) : "Published " + esc(x.date)) + "</span>";
    if (x.venue && x.destination !== "wikipedia") m += "<span>" + esc(x.venue) + "</span>";
    if (x.doi) m += "<span>DOI " + esc(x.doi) + "</span>";
    meta.innerHTML = m;
    if (m) d.appendChild(meta);

    if (x.snippet) d.appendChild(el("p", x.snippet, "rsnip"));

    const act = el("div", undefined, "ract");
    const rb = el("button", "Read this page", "btn btn-o btn-s");
    rb.type = "button";
    rb.onclick = function () { readResultPage(x.url); };
    act.appendChild(rb);
    d.appendChild(act);
    c.appendChild(d);
  });

  if (total > 10) {
    const more = el("button", searchShowAll ? "Show fewer" : "Show all " + total + " results", "mini");
    more.onclick = function () { searchShowAll = !searchShowAll; drawSearch(); };
    c.appendChild(more);
  }
  out.appendChild(c);
}

async function runSearch() {
  if (searchBusy) return;
  const inp = document.getElementById("searchQ");
  const text = inp ? inp.value.trim() : "";
  if (text.length < 3) { searchError = "Enter what you want to search for."; searchResult = null; drawSearch(); return; }
  const dests = Object.keys(searchDest).filter(function (k) { return searchDest[k]; });
  searchQuery = text; searchBusy = true; searchError = ""; searchResult = null; searchShowAll = false;
  drawSearch();
  try {
    const token = await getToken();
    const r = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": SUPABASE_KEY },
      body: JSON.stringify({ query: text, destinations: dests, limit: 8 })
    });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok || !data.results) throw new Error(data.error || "Something went wrong. Please try again.");
    searchResult = data;
  } catch (err) {
    searchError = err.message || "Something went wrong.";
  }
  searchBusy = false;
  drawSearch();
}

function readResultPage(url) {
  const inp = document.getElementById("readUrl");
  if (inp) inp.value = url;
  readUrl = url;
  readPage();
  const card = document.getElementById("readCard");
  if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
}

render();
