(function () {
  "use strict";
  const data = window.CTF_AUDIT_DATA;
  const setCodes = Array.isArray(window.CTF_AUDIT_SETS) && window.CTF_AUDIT_SETS.length ? window.CTF_AUDIT_SETS : [];
  const version = window.CTF_AUDIT_VERSION || "V1";
  const root = document.getElementById("app");
  if (!data || !setCodes.length || !root) {
    document.body.textContent = "This local audit needs its companion data files.";
    return;
  }

  const esc = value => String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const plain = value => String(value || "").replace(/\s*\[[^\]]*\]\.?\s*$/, "").replace(/\s+/g, " ").trim();
  const h = (strings, ...values) => strings.reduce((out, string, index) => out + string + (index < values.length ? values[index] : ""), "");
  let activeSet = setCodes[0];
  let cards = [];
  let storageKey = "";
  let reviewState = {};
  const importedAnmReview = {
    "241af01302d3f0a4d45c": { choice: "d", dText: "A visionary strategist who carries the flame of disciplined ambition. Though small in stature, his insight shapes the course of battles. Those who follow him move with purpose and clarity. [Dr Zoom]", readiness: "ready", child: "Dr Zoom is a small defender with a big Counter Pressure number. He does not use a special power, so he is a simple card to learn with.", combo: "Hold the line, then make helpers [Suggested]" },
    "5ce5f6d140db10b42c3b": { choice: "d", dText: "Increase the Pressure of every Catalyst with \"The Great\" in its name by 400. When one destroys an opponent's Catalyst, add a counter to this card. During Action or Resolution Phase: Remove 2 counters to add 1 Catalyst with \"The Great\" in its name from your Deck or Void to your hand.", child: "This card cheers for every friend whose name says “The Great.” They get 400 more Pressure, like getting a little stronger for battle.", combo: "Great-team power-up [Suggested]", referee: { choice: "a" } },
    "54f26a8edebff0adaa1d": { choice: "b", readiness: "ready", child: "This card makes three pretend helper fighters called Tokens. They can fight, but this card says they cannot be used as a Tribute.", combo: "Make a Great-team crowd [Suggested]" },
    "bcf424b8516c6f6d2d02": { choice: "d", dText: "Pay 1500 Chi: target 1 Catalyst on the field; copy its effect until the End Phase. You may activate this effect only during Action Phase or Resolution Phase.", child: "Ace can pay some Chi to borrow another fighter’s special move for a little while. Borrowing a move costs 1500 Chi, so save it for a good moment.", combo: "Borrow a Great-team move [Needs ruling]", referee: { choice: "d", custom: "Action Phase 1 or 2 = Action Phase or Resolution Phase" } },
    "205020a9837450025be4": { child: "Zero Degrees freezes both players’ Trick cards for a while. That means neither player can play or set Palm Tricks or Concealed Tricks during the freeze.", combo: "Freeze Tricks, then use a Catalyst ability [Needs ruling]", referee: { choice: "a" } }
  };

  function activate(setCode) {
    activeSet = setCodes.includes(setCode) ? setCode : setCodes[0];
    cards = data.cards.filter(card => card.set === activeSet);
    storageKey = "ctf-card-audit:" + activeSet + ":" + data.snapshot.hash;
    reviewState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  }
  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(reviewState));
  }
  function childDraft(card) {
    const text = plain(card.original).toLowerCase();
    if (card.group.includes("/Normal")) return card.name + " is a simple character card with no special move in the rules text. Learn its Level, Pressure, and Counter Pressure first.";
    if (text.includes("fusion materials")) return card.name + " is made by putting the listed helpers together. Check which friends it needs before you play it.";
    if (text.includes("equip")) return card.name + " is an item card you attach to a helper. It makes that helper better when its matching rule is true.";
    if (text.includes("special summon") || text.includes("special spawn")) return card.name + " lets a helper come onto the field in a special way. Read the cost and limits before you use it.";
    if (text.includes("destroy")) return card.name + " can knock a helper or card off the field. Check when it happens and what it is allowed to choose.";
    if (text.includes("pressure") || text.includes("counter pressure")) return card.name + " changes how strong a helper is in a fight. The exact timing still needs a careful check.";
    if (text.includes("chi")) return card.name + " uses Chi, which is like spending some game energy. Make sure you have enough before you use its move.";
    return card.name + " has a special job written on the card. This is a learning draft, so a reviewer should make the exact rule easy to say out loud.";
  }
  function companion(card) {
    const quoted = plain(card.original).match(/"([^"]+)"/);
    if (quoted && quoted[1] !== card.name) return quoted[1];
    const nearby = cards.find(other => other.id !== card.id && (other.group.includes("/Normal") || other.name.includes("The Great")));
    return nearby ? nearby.name : "another legal card in this set";
  }
  function defaultReview(card) {
    const draft = childDraft(card);
    const imported = activeSet === "ANM" ? importedAnmReview[card.id] || {} : {};
    return Object.assign({
      choice: "",
      dText: "",
      child: draft,
      teach: "I would tell my friend: “" + draft + "”",
      combo: "Easy practice pairing: " + card.name + " + " + companion(card) + ". Read both cards, play each only when its own printed rule allows it, and point out what each one contributes. Suggested only—no official combo certification is stored in this snapshot.",
      readiness: "",
      referee: {},
      notes: ""
    }, imported, reviewState[card.id] || {});
  }
  function saveCard(card, patch) {
    reviewState[card.id] = Object.assign(defaultReview(card), patch);
    persist();
  }
  function cardFor(id) {
    return cards.find(card => card.id === id);
  }
  function badge(card) {
    const certification = card.certification === "Certified" ? "green" : card.certification === "NeedsRuling" ? "red" : "yellow";
    const compiled = ["FullyCompiled", "NoEffect"].includes(card.compile) ? "green" : "yellow";
    return h`<span class="badge ${certification}">${esc(card.certification)}</span><span class="badge ${compiled}">${esc(card.compile)}</span>`;
  }
  function refereePanel(card, item) {
    if (card.certification !== "NeedsRuling") {
      return h`<p class="source">No referee answer is listed as open for this card. This local status does not change certification or engine status.</p><p class="button-row"><button data-ready="ready" data-id="${card.id}" class="${item.readiness === "ready" ? "selected-good" : ""}">Ready for local review</button><button data-ready="not-ready" data-id="${card.id}" class="${item.readiness === "not-ready" ? "selected-bad" : ""}">Not ready</button></p>`;
    }
    const question = card.unresolved || "What card rule needs an official referee answer before automatic gameplay is safe?";
    const selected = item.referee.choice || "";
    return h`<fieldset><legend>Needs a referee answer before automatic gameplay</legend><p><b>Question:</b> ${esc(question)}</p><label><input type="radio" name="ref-${card.id}" data-referee="a" data-id="${card.id}" ${selected === "a" ? "checked" : ""}> A. Ask for an official referee answer.</label><label><input type="radio" name="ref-${card.id}" data-referee="b" data-id="${card.id}" ${selected === "b" ? "checked" : ""}> B. Keep this card in manual-play testing only.</label><label><input type="radio" name="ref-${card.id}" data-referee="c" data-id="${card.id}" ${selected === "c" ? "checked" : ""}> C. Return it for a rules-ready rewrite before testing.</label><label><input type="radio" name="ref-${card.id}" data-referee="d" data-id="${card.id}" ${selected === "d" ? "checked" : ""}> D. Write my own proposed answer.</label>${selected === "d" ? h`<textarea data-field="refereeCustom" data-id="${card.id}" placeholder="Your proposed referee answer">${esc(item.referee.custom || "")}</textarea>` : ""}</fieldset>`;
  }
  function cardHtml(card) {
    const item = defaultReview(card);
    const canonical = card.canonical || "No separate engine-normalized text was recorded in this snapshot.";
    const choice = (key, title, note) => h`<button data-choice="${key}" data-id="${card.id}" class="choice ${item.choice === key ? "selected" : ""}"><b>${key.toUpperCase()}. ${title}</b><small>${note}</small></button>`;
    return h`
      <details class="card">
        <summary>
          <div><h2>${esc(card.name)}</h2><p class="source">ID ${esc(card.id)} · ${esc(card.group)}</p></div>
          <div class="badges">${badge(card)}</div>
        </summary>
        <div class="inside">
          <div class="two">
            <section>
              <h3>Card basics</h3>
              <p class="facts">Set ${esc(card.set)} · Level ${esc(card.level || "—")} · Pressure ${esc(card.pressure || "—")} · Counter Pressure ${esc(card.counterPressure || "—")}</p>
              <h4>Original / reference text</h4><div class="text original">${esc(card.original)}</div>
              <h4>Current engine-normalized text</h4><div class="text canonical">${esc(canonical)}</div>
              <p class="source">Read-only source: ${esc(card.sourceFile)}, line ${esc(card.sourceLine)} · cards.json</p>
            </section>
            <section>
              <h3>What this card does — child-friendly draft</h3>
              <textarea data-field="child" data-id="${card.id}">${esc(item.child)}</textarea>
              <h4>Teach a friend</h4><textarea data-field="teach" data-id="${card.id}">${esc(item.teach)}</textarea>
              <p class="hint">Learning words are review drafts, not official rules text.</p>
            </section>
          </div>
          <div class="two">
            <section>
              <h3>Text review choices</h3>
              <div class="choices">${choice("a", "Minimal cleanup", "Keep meaning; fix grammar and formatting.")}${choice("b", "Rules-ready review", "Use recorded engine text; do not guess.")}${choice("c", "Beginner-friendly review", "Simple player words; not official replacement text.")}${choice("d", "Write my own", "Open the editable D field.")}</div>
              ${item.choice === "d" ? h`<h4>D. My wording</h4><textarea data-field="dText" data-id="${card.id}" placeholder="Write custom wording">${esc(item.dText)}</textarea>` : ""}
              <h4>Review notes / why I changed it</h4><textarea data-field="notes" data-id="${card.id}" placeholder="Saved in this browser only">${esc(item.notes)}</textarea>
            </section>
            <section>
              <h3>Official rules proof & readiness</h3>
              <p class="${card.certification === "NeedsRuling" ? "warning" : ""}"><b>${card.certification === "NeedsRuling" ? "No official ruling found yet in this snapshot." : "No verified official card-specific ruling file is included in this snapshot."}</b></p>
              <p class="source">Certification ledger — Card ID ${esc(card.id)} · ${esc(card.certification)} / ${esc(card.compile)} (card-certification-ledger.csv).</p>
              <p class="source">Engine-supported interpretation only: effect-rulings-required.csv / engine compile state. This is not an official ruling.</p>
              ${refereePanel(card, item)}
            </section>
          </div>
          <div class="two">
            <section>
              <h3>Combo idea — practice draft</h3><div class="text combo">${esc(item.combo)}</div>
              <textarea data-field="combo" data-id="${card.id}">${esc(item.combo)}</textarea>
              <p class="hint"><span class="badge yellow">Suggested</span> This is not official combo certification.</p>
            </section>
            <section>
              <h3>Audit details</h3><p><b>Trigger:</b> ${esc(card.trigger || "No executable trigger listed")}</p>
              <p><b>Unresolved clauses:</b> ${esc(card.unresolved || "None recorded in the ledger")}</p>
              <p class="source">Local choices never modify the database, source card, certification ledger, or engine.</p>
            </section>
          </div>
        </div>
      </details>`;
  }
  function addStyle() {
    document.head.insertAdjacentHTML("beforeend", '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;900&family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap">');
    document.head.insertAdjacentHTML("beforeend", "<style>:root{--bg:#090b12;--p:#121827;--line:#34435f;--ink:#edf3ff;--muted:#aebbd2;--g:#61d59a;--y:#ffcf72;--r:#ff6879;--b:#72b8ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 45% -20%,#322043,#090b12 48%);color:var(--ink);font:16px/1.46 system-ui,-apple-system,Segoe UI,sans-serif}.page{max-width:1300px;margin:auto;padding:22px}.hero{border:1px solid #624779;border-radius:18px;padding:23px;background:linear-gradient(120deg,#261732,#111a2c)}.eyebrow{font-size:.77rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#dfb8ff}.hero h1{margin:.18rem 0 .55rem;font-size:clamp(1.75rem,4vw,3rem);line-height:1.07}.hero p{margin:.25rem 0;color:#dae4fa}.notice{margin-top:13px;padding:10px 12px;border:1px solid #705a35;border-radius:9px;background:#241e11}.bar,.stats,.controls,.badges,.button-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.bar{justify-content:space-between;margin-top:16px}.button,button{border:1px solid #485b7d;border-radius:8px;padding:8px 10px;background:#172239;color:var(--ink);font:inherit;font-weight:700;cursor:pointer}button:hover{border-color:var(--b)}a{color:#91c9ff}.stats{margin:17px 0}.stat{flex:1;min-width:130px;padding:11px;border:1px solid var(--line);border-radius:10px;background:#101827}.stat b{display:block;font-size:1.35rem}.stat span,.source,.hint{font-size:.84rem;color:var(--muted)}.controls{position:sticky;top:0;z-index:2;padding:11px;margin:13px 0;border:1px solid var(--line);border-radius:11px;background:#0b111de9;backdrop-filter:blur(8px)}input,select,textarea{font:inherit;color:var(--ink);background:#09101a;border:1px solid #40516e;border-radius:8px;padding:8px}#search{flex:1;min-width:245px}textarea{width:100%;min-height:82px;resize:vertical}.cards{display:grid;gap:12px}.card{border:1px solid var(--line);border-radius:13px;background:linear-gradient(145deg,#151c2c,#0f1420);overflow:hidden}.card[open]{border-color:#5e739e}.card summary{cursor:pointer;list-style:none;padding:14px;display:flex;justify-content:space-between;gap:10px;align-items:center}.card summary::-webkit-details-marker{display:none}.card h2{margin:0;font-size:1.18rem}.card h3{margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em;font-size:.87rem;color:#bbcae7}.card h4{margin:10px 0 4px;font-size:.86rem}.inside{padding:0 14px 17px}.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.two>section{border:1px solid #2f3d57;border-radius:10px;padding:12px;background:#0c1320}.facts{color:#c7d5ef}.text{padding:9px;border-radius:7px;white-space:pre-wrap;background:#080d15;border-left:3px solid #7086b2}.canonical{border-color:#64c99c}.combo{border-color:#6eadfa}.badge{border:1px solid var(--line);border-radius:999px;padding:3px 8px;font-size:.75rem;font-weight:800}.green{color:var(--g);border-color:#3b875f}.yellow{color:var(--y);border-color:#8a6d34}.red{color:var(--r);border-color:#a34c5c}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.choice{min-height:51px;text-align:left}.choice small{display:block;font-weight:400;color:#cbd8ee}.choice.selected{background:#4a3d21;border-color:#fff1af}.warning{padding:8px;border:1px solid #826425;border-radius:8px;background:#271f0e;color:#ffdb86}fieldset{margin:10px 0 0;border:1px solid #86662b;border-radius:9px;background:#231d10}legend{color:#ffdb86;font-weight:800}fieldset label{display:block;margin:6px 0}.selected-good{background:#153d2a;border-color:#49bd7e}.selected-bad{background:#401b24;border-color:#cc5a6a}.empty{padding:20px;color:var(--muted)}dialog{max-width:650px;color:var(--ink);background:#151f31;border:1px solid #63779f;border-radius:12px}dialog::backdrop{background:#0009}@media(max-width:800px){.page{padding:12px}.two,.choices{grid-template-columns:1fr}.card summary{align-items:flex-start}}</style>");
    document.head.insertAdjacentHTML("beforeend", '<style>body{font-family:"DM Sans",system-ui,sans-serif}.ctf-alpha-brand{display:flex;align-items:center;gap:12px;margin:0 0 12px}.ctf-alpha-brand__mark{width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(255,106,0,.56))}.ctf-alpha-brand__logo{width:min(350px,68vw);height:auto;filter:drop-shadow(0 0 18px rgba(255,88,0,.22))}.hero h1{font-family:"Bebas Neue","Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#f5f0e8;text-shadow:0 0 28px rgba(255,79,0,.35)}.eyebrow{font-family:"Barlow Condensed",sans-serif;color:#ffb347;letter-spacing:.18em}.hero{border-color:rgba(255,106,0,.5);background:linear-gradient(135deg,#271009,#12100f 54%,#211509)}.button,button{border-color:rgba(255,143,57,.55);background:linear-gradient(180deg,#312016,#17120d)}.button:hover,button:hover{border-color:#ffd060;box-shadow:0 0 18px rgba(255,104,0,.18)}@media(max-width:580px){.ctf-alpha-brand{gap:8px}.ctf-alpha-brand__mark{width:46px;height:46px}.ctf-alpha-brand__logo{width:min(280px,72vw)}}</style>');
  }
  function buildPage() {
    const options = setCodes.map(code => h`<option value="${esc(code)}">${esc(code)}</option>`).join("");
    root.innerHTML = h`<main class="page"><section class="hero"><div class="eyebrow">Internal-only • read-only snapshot • one active set at a time</div><h1>Carry The Flame<br><span id="versionTitle">${esc(version)} · ${esc(activeSet)}</span> Audit</h1><p>This version groups ${setCodes.length} sets. Choose one below; only that set’s cards are displayed, keeping the active review under 300 cards.</p><div class="notice"><b>Evidence rule:</b> review selections are local notes. They never become official rulings or change the source database.</div><div class="bar"><a class="button" href="CTF-CARD-TEXT-AUDIT-00-SET-QUEUE.html">← Five audit versions</a><div class="button-row"><button data-action="json">Export JSON</button><button data-action="csv">CSV</button><button data-action="txt">TXT</button><button data-action="md">Markdown</button><button data-action="import">Import JSON</button><button data-action="validate">Validate</button><input id="importFile" type="file" accept="application/json" hidden></div></div></section><section id="stats" class="stats"></section><section class="controls"><label class="source">Set <select id="setPicker">${options}</select></label><input id="search" placeholder="Search card name, text, rewrite, combo, or source"><select id="cert"><option value="">All certification states</option><option>Certified</option><option>NeedsExecutor</option><option>NeedsRuling</option><option>NeedsMetadata</option></select><select id="review"><option value="">All review states</option><option value="unreviewed">Not reviewed</option><option value="reviewed">Reviewed</option><option value="ruling">Needs referee answer</option><option value="ready">Locally ready</option><option value="d">Has D text</option></select><button data-action="clear">Clear filters</button><span id="shown" class="source"></span></section><section id="cards" class="cards"></section></main><dialog id="modal"><form method="dialog"><h2 id="modalTitle">Audit</h2><p id="modalText"></p><button>Close</button></form></dialog>`;
    root.querySelector(".hero").insertAdjacentHTML("afterbegin", '<div class="ctf-alpha-brand"><img class="ctf-alpha-brand__mark" src="assets/ctf-mark.png" alt=""><img class="ctf-alpha-brand__logo" src="assets/carry-the-flame-horizontal.png" alt="Carry The Flame"></div>');
    document.getElementById("setPicker").value = activeSet;
    document.getElementById("importFile").addEventListener("change", importData);
  }
  function render() {
    const query = document.getElementById("search").value.toLowerCase();
    const certification = document.getElementById("cert").value;
    const filter = document.getElementById("review").value;
    const filtered = cards.filter(card => {
      const item = defaultReview(card);
      const haystack = [card.name, card.group, card.original, card.canonical, card.unresolved, item.dText, item.child, item.teach, item.combo, item.notes].join(" ").toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (certification && card.certification !== certification) return false;
      if (filter === "unreviewed" && item.choice) return false;
      if (filter === "reviewed" && !item.choice) return false;
      if (filter === "ruling" && card.certification !== "NeedsRuling") return false;
      if (filter === "ready" && item.readiness !== "ready") return false;
      if (filter === "d" && !item.dText.trim()) return false;
      return true;
    });
    document.getElementById("cards").innerHTML = filtered.map(cardHtml).join("") || '<div class="empty">No cards match this filter.</div>';
    document.getElementById("shown").textContent = filtered.length + " of " + cards.length + " cards shown";
    document.getElementById("versionTitle").textContent = version + " · " + activeSet;
    const entries = cards.map(defaultReview);
    document.getElementById("stats").innerHTML = h`<div class="stat"><b>${cards.length}</b><span>active set cards</span></div><div class="stat"><b>${entries.filter(entry => entry.choice).length}</b><span>reviewed cards</span></div><div class="stat"><b>${entries.filter(entry => entry.dText.trim()).length}</b><span>D fields filled</span></div><div class="stat"><b>${entries.filter(entry => entry.readiness).length}</b><span>Ready / Not ready set</span></div><div class="stat"><b>${cards.filter(card => card.certification === "NeedsRuling").length}</b><span>need referee answers</span></div><div class="stat"><b>0</b><span>verified official card rulings</span></div>`;
  }
  function modal(title, text) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalText").textContent = text;
    document.getElementById("modal").showModal();
  }
  function rows() {
    return cards.map(card => {
      const item = defaultReview(card);
      return { card_id: card.id, set: card.set, name: card.name, certification: card.certification, compile_state: card.compile, selected_rewrite: item.choice, custom_d_text: item.dText, child_explanation: item.child, teach_a_friend: item.teach, combo: item.combo, combo_evidence: "Suggested / not official", readiness: item.readiness, referee_answer: JSON.stringify(item.referee), official_citations: "No verified official card-ruling file in this snapshot", notes: item.notes };
    });
  }
  function download(type) {
    const records = rows();
    let text = "", mime = "text/plain", suffix = type;
    if (type === "json") { text = JSON.stringify({ auditVersion: version, auditSet: activeSet, snapshot: data.snapshot, reviewState, cards: records }, null, 2); mime = "application/json"; }
    if (type === "csv") { text = Object.keys(records[0]).join(",") + "\\n" + records.map(record => Object.values(record).map(value => '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"').join(",")).join("\\n"); mime = "text/csv"; }
    if (type === "txt") { text = records.map(record => record.name + " (" + record.card_id + ")\\nStatus: " + record.certification + " / " + record.compile_state + "\\nChoice: " + (record.selected_rewrite || "Not reviewed") + "\\nRewrite: " + (record.custom_d_text || "—") + "\\nReadiness: " + (record.readiness || "Not set") + "\\nReferee answers: " + record.referee_answer + "\\nChild explanation: " + record.child_explanation + "\\nCombo: " + record.combo + "\\nEvidence: " + record.official_citations + "\\nNotes: " + (record.notes || "—")).join("\\n\\n"); }
    if (type === "md") { text = "# Carry The Flame — " + activeSet + " Audit\\n\\n" + records.map(record => "## " + record.name + "\\n\\n- ID: " + record.card_id + "\\n- Status: " + record.certification + " / " + record.compile_state + "\\n- Choice: " + (record.selected_rewrite || "Not reviewed") + "\\n- Child explanation: " + record.child_explanation + "\\n- Combo: " + record.combo).join("\\n\\n"); }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: mime }));
    link.download = "CTF-" + activeSet + "-card-audit." + suffix;
    document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }
  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = JSON.parse(reader.result);
        const incoming = bundle.reviewState || bundle;
        Object.keys(incoming).forEach(id => { if (cardFor(id)) reviewState[id] = incoming[id]; });
        persist(); render(); modal("Import complete", "Imported local review data for matching " + activeSet + " card IDs only. Source data was not changed.");
      } catch (error) { modal("Import failed", error.message); }
    };
    reader.readAsText(file);
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    const card = cardFor(button.dataset.id);
    if (card && button.dataset.choice) { saveCard(card, { choice: button.dataset.choice }); render(); return; }
    if (card && button.dataset.ready) { saveCard(card, { readiness: button.dataset.ready }); render(); return; }
    const action = button.dataset.action;
    if (["json", "csv", "txt", "md"].includes(action)) download(action);
    if (action === "import") document.getElementById("importFile").click();
    if (action === "clear") { document.getElementById("search").value = ""; document.getElementById("cert").value = ""; document.getElementById("review").value = ""; render(); }
    if (action === "validate") modal("Validation", "Version " + version + " · " + activeSet + ": " + cards.length + " cards (cap: 300)\\nMissing permanent IDs: " + cards.filter(card => !card.id).length + "\\nBlank child explanations: " + cards.filter(card => !defaultReview(card).child.trim()).length + "\\nBlank combo ideas: " + cards.filter(card => !defaultReview(card).combo.trim()).length + "\\nCards needing referee answers: " + cards.filter(card => card.certification === "NeedsRuling").length + "\\nVerified official card-ruling files: 0\\nSource write controls: none.");
  });
  document.addEventListener("input", event => {
    if (!event.target.dataset.field) return;
    const card = cardFor(event.target.dataset.id);
    if (!card) return;
    const item = defaultReview(card);
    if (event.target.dataset.field === "refereeCustom") item.referee.custom = event.target.value;
    else item[event.target.dataset.field] = event.target.value;
    saveCard(card, item);
  });
  document.addEventListener("change", event => {
    if (event.target.id === "setPicker") {
      activate(event.target.value);
      buildPage();
      render();
      return;
    }
    if (event.target.dataset.referee) {
      const card = cardFor(event.target.dataset.id);
      const item = defaultReview(card);
      item.referee.choice = event.target.dataset.referee;
      saveCard(card, item);
      render();
      return;
    }
    if (["search", "cert", "review"].includes(event.target.id)) render();
  });
  activate(activeSet);
  addStyle();
  buildPage();
  render();
})();
