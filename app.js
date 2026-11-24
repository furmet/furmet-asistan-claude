"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

// ---------- Depolama ----------
const DEF = { goals: [], tasks: [], chat: [], settings: { name: "", apiKey: "", model: "claude-sonnet-5-5", speak: false, kinds: ["ayet", "hadis", "söz"] } };
let db;
try { db = Object.assign({}, DEF, JSON.parse(localStorage.getItem("asistan") || "{}")); } catch { db = structuredClone(DEF); }
db.settings = Object.assign({}, DEF.settings, db.settings);
const save = () => localStorage.setItem("asistan", JSON.stringify(db));

// ---------- Günün sözü ----------
function dayQuote(offset = 0) {
  const pool = QUOTES.filter(q => db.settings.kinds.includes(q.k));
  const list = pool.length ? pool : QUOTES;
  const d = Math.floor(Date.now() / 864e5) + offset;
  return list[((d % list.length) + list.length) % list.length];
}
let qOff = 0;

// ---------- Sekmeler ----------
let tab = "bugun";
const views = { bugun: vBugun, hedef: vHedef, koc: vKoc, ayar: vAyar };
function go(t) {
  tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  $("#view").innerHTML = "";
  views[t]();
  $("#view").scrollTop = t === "koc" ? 1e9 : 0;
}
$("#tabs").onclick = e => { const b = e.target.closest("button"); if (b) go(b.dataset.tab); };

// ---------- Bugün ----------
function vBugun() {
  const q = dayQuote(qOff), v = $("#view");
  const hr = new Date().getHours();
  const hi = hr < 6 ? "İyi geceler" : hr < 12 ? "Günaydın" : hr < 18 ? "İyi günler" : "İyi akşamlar";
  const open = db.tasks.filter(t => !t.done);
  const todayT = open.filter(t => !t.due || t.due <= today());
  v.innerHTML = `
    <h1>${hi}${db.settings.name ? " " + esc(db.settings.name) : ""} 👋</h1>
    <p class="sub">${new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</p>
    <div class="card quote"><div class="t">“${esc(q.t)}”</div>
      <div class="s"><span>${esc(q.s)} <span class="tag">${esc(q.k)}</span></span><button class="btn sec" id="nq" style="padding:6px 12px">Sonraki</button></div></div>
    <h2>Bugünün görevleri (${todayT.length})</h2>
    <div class="add"><input id="nt" placeholder="Yeni görev ekle…" enterkeyhint="done"><button class="btn" id="at">+</button></div>
    <div id="tl"></div>
    <button class="btn sec" style="width:100%;margin-top:14px" id="plan">✨ Koçtan günümü planlamasını iste</button>`;
  $("#nq").onclick = () => { qOff++; vBugun(); };
  const add = () => { const x = $("#nt").value.trim(); if (!x) return; db.tasks.push({ id: uid(), title: x, done: false, goal: "", due: today() }); save(); vBugun(); };
  $("#at").onclick = add; $("#nt").onkeydown = e => { if (e.key === "Enter") add(); };
  $("#tl").innerHTML = todayT.map(taskRow).join("") || `<p class="note">Bugün için görev yok. Harika, ya da bir şey ekle 🙂</p>`;
  bindTasks(vBugun);
  $("#plan").onclick = () => { go("koc"); ask("Bugünkü görevlerime ve hedeflerime bakarak bana kısa, gerçekçi bir gün planı çıkar."); };
}
function taskRow(t) {
  const g = db.goals.find(g => g.id === t.goal);
  return `<div class="card row" data-id="${t.id}"><button class="chk ${t.done ? "on" : ""}" data-a="tg">${t.done ? "✓" : ""}</button>
    <div class="grow"><div class="${t.done ? "done" : ""}">${esc(t.title)}</div>${g ? `<div class="meta">🎯 ${esc(g.title)}</div>` : ""}</div>
    <button class="btn del" data-a="rm">Sil</button></div>`;
}
function bindTasks(refresh) {
  document.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const id = b.closest("[data-id]").dataset.id, t = db.tasks.find(t => t.id === id);
    if (b.dataset.a === "tg") t.done = !t.done;
    else if (b.dataset.a === "rm") db.tasks = db.tasks.filter(x => x.id !== id);
    save(); refresh();
  });
}

// ---------- Hedefler ----------
function vHedef() {
  const v = $("#view");
  v.innerHTML = `<h1>Hedefler 🎯</h1><p class="sub">Büyük resim: neye doğru gidiyorsun?</p>
    <div class="card"><input id="gt" placeholder="Yeni hedef (örn. Yılda 20 kitap oku)"><label>Bitiş tarihi (isteğe bağlı)</label><input id="gd" type="date">
    <button class="btn" id="ag" style="width:100%;margin-top:10px">Hedef ekle</button></div><div id="gl"></div>`;
  $("#ag").onclick = () => {
    const t = $("#gt").value.trim(); if (!t) return;
    db.goals.push({ id: uid(), title: t, due: $("#gd").value }); save(); vHedef();
  };
  $("#gl").innerHTML = db.goals.map(g => {
    const ts = db.tasks.filter(t => t.goal === g.id), dn = ts.filter(t => t.done).length;
    const pct = ts.length ? Math.round(dn / ts.length * 100) : 0;
    return `<div class="card" data-gid="${g.id}"><div class="row"><div class="grow"><b>${esc(g.title)}</b>
      <div class="meta">${g.due ? "📅 " + new Date(g.due).toLocaleDateString("tr-TR") + " · " : ""}${dn}/${ts.length} görev · %${pct}</div></div>
      <button class="btn del" data-rg>Sil</button></div><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="add"><input placeholder="Bu hedef için adım ekle…" data-gi><button class="btn sec" data-ga>+</button></div>
      ${ts.map(taskRow).join("")}</div>`;
  }).join("") || `<p class="note">Henüz hedef yok.</p>`;
  document.querySelectorAll("[data-ga]").forEach(b => b.onclick = () => {
    const c = b.closest("[data-gid]"), x = $("[data-gi]", c).value.trim(); if (!x) return;
    db.tasks.push({ id: uid(), title: x, done: false, goal: c.dataset.gid, due: "" }); save(); vHedef();
  });
  document.querySelectorAll("[data-rg]").forEach(b => b.onclick = () => {
    const id = b.closest("[data-gid]").dataset.gid;
    if (!confirm("Hedef silinsin mi?")) return;
    db.goals = db.goals.filter(g => g.id !== id); db.tasks.forEach(t => { if (t.goal === id) t.goal = ""; }); save(); vHedef();
  });
  bindTasks(vHedef);
}

// ---------- Koç (Claude) ----------
function system() {
  const open = db.tasks.filter(t => !t.done).map(t => `- ${t.title}${t.goal ? " (hedef: " + (db.goals.find(g => g.id === t.goal) || {}).title + ")" : ""}`).join("\n") || "yok";
  const goals = db.goals.map(g => `- ${g.title}${g.due ? " (bitiş " + g.due + ")" : ""}`).join("\n") || "yok";
  return `Sen ${db.settings.name || "kullanıcının"} kişisel gelişim asistanı ve koçusun. Türkçe, samimi, kısa ve net konuş (sesli okunacak, madde işareti ve markdown kullanma, en fazla 5-6 cümle). Motive et ama gerçekçi ol. İslami değerlere saygılısın; ayet ve hadis aktarırken emin değilsen "kaynağını doğrula" de.
Bugün: ${new Date().toLocaleDateString("tr-TR", { dateStyle: "full" })}.
Hedefler:\n${goals}\nAçık görevler:\n${open}`;
}
function vKoc() {
  const v = $("#view");
  v.innerHTML = `<h1>Koç 💬</h1><p class="sub">Hedeflerini ve görevlerini bilen kişisel asistanın.</p>
    <div class="chips">${["Günümü planla", "Bugün motivasyona ihtiyacım var", "Haftamı değerlendir", "Bir alışkanlık önerir misin?"].map(x => `<button data-q="${x}">${x}</button>`).join("")}</div>
    <div class="chat" id="ch"></div><div style="height:70px"></div>
    <div class="composer"><textarea id="mi" rows="1" placeholder="Bir şey sor…"></textarea>
    <button class="btn sec" id="mic">🎤</button><button class="btn" id="send">➤</button></div>`;
  draw();
  document.querySelectorAll("[data-q]").forEach(b => b.onclick = () => ask(b.dataset.q));
  const send = () => { const x = $("#mi").value.trim(); if (x) { $("#mi").value = ""; ask(x); } };
  $("#send").onclick = send;
  $("#mic").onclick = dictate;
}
function draw() {
  const ch = $("#ch"); if (!ch) return;
  ch.innerHTML = db.chat.map(m => `<div class="msg ${m.role === "user" ? "u" : "a"}">${esc(m.content)}</div>`).join("");
  $("#view").scrollTop = 1e9;
}
let busy = false;
async function ask(text) {
  if (busy) return;
  if (/yedek|verilerimi (al|ver)|başka telefon|telefon(u)? değiş/i.test(text)) {
    if (tab !== "koc") go("koc");
    db.chat.push({ role: "user", content: text }, { role: "assistant", content: "Yedek dosyasını hazırladım. Açılan menüden Dosyalar'a kaydet ya da AirDrop ile yeni telefona gönder. Yeni telefonda Ayarlar → İçe aktar. API anahtarı güvenlik için yedeğe girmez, yeni telefonda tekrar yazman gerekir." });
    save(); draw(); exportData(); return;
  }
  if (!db.settings.apiKey) { db.chat.push({ role: "assistant", content: "Önce Ayarlar'dan Anthropic API anahtarını girmelisin." }); save(); if (tab !== "koc") go("koc"); else draw(); return; }
  if (tab !== "koc") go("koc");
  db.chat.push({ role: "user", content: text }); busy = true; draw();
  $("#ch").insertAdjacentHTML("beforeend", `<div class="msg a" id="typing">…</div>`);
  $("#view").scrollTop = 1e9;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": db.settings.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: db.settings.model, max_tokens: 700, system: system(), messages: db.chat.slice(-20).map(({ role, content }) => ({ role, content })) })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    const out = j.content.map(c => c.text || "").join("").trim();
    db.chat.push({ role: "assistant", content: out });
    if (db.settings.speak) speak(out);
  } catch (e) {
    db.chat.pop();
    db.chat.push({ role: "assistant", content: "Hata: " + e.message });
  }
  busy = false; save(); draw();
}
function speak(t) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(t); u.lang = "tr-TR"; speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function dictate() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Bu tarayıcıda sesli yazma yok. Klavyedeki mikrofonu kullanabilirsin.");
  const r = new SR(); r.lang = "tr-TR"; r.interimResults = false;
  r.onresult = e => { $("#mi").value = e.results[0][0].transcript; ask($("#mi").value); $("#mi").value = ""; };
  r.start();
}

// ---------- Yedek ----------
async function exportData() {
  const d = JSON.parse(JSON.stringify(db)); d.settings.apiKey = "";
  const name = "asistan-yedek-" + today() + ".json", txt = JSON.stringify(d, null, 2);
  const f = new File([txt], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Asistanım yedek" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = name; a.click();
}

// ---------- Ayarlar ----------
function vAyar() {
  const s = db.settings;
  $("#view").innerHTML = `<h1>Ayarlar ⚙️</h1>
    <label>Adın</label><input id="sn" value="${esc(s.name)}">
    <label>Anthropic API anahtarı</label><input id="sk" type="password" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off">
    <p class="note">Anahtar sadece bu telefonda saklanır, Anthropic dışında kimseye gönderilmez.</p>
    <label>Model</label><input id="sm" value="${esc(s.model)}">
    <label>Günün sözü türleri</label>
    ${["ayet", "hadis", "söz"].map(k => `<label style="display:flex;gap:10px;align-items:center;color:var(--tx)"><input type="checkbox" style="width:auto" data-k="${k}" ${s.kinds.includes(k) ? "checked" : ""}> ${k}</label>`).join("")}
    <label style="display:flex;gap:10px;align-items:center;color:var(--tx);margin-top:14px"><input type="checkbox" id="ss" style="width:auto" ${s.speak ? "checked" : ""}> Koç cevaplarını sesli oku</label>
    <button class="btn" id="sv" style="width:100%;margin-top:16px">Kaydet</button>
    <h2>Yedek</h2>
    <button class="btn sec" id="ex" style="width:100%">Verileri dışa aktar</button>
    <button class="btn sec" id="im" style="width:100%;margin-top:8px">İçe aktar</button>
    <button class="btn sec" id="cc" style="width:100%;margin-top:8px">Sohbeti temizle</button>`;
  $("#sv").onclick = () => {
    Object.assign(db.settings, { name: $("#sn").value.trim(), apiKey: $("#sk").value.trim(), model: $("#sm").value.trim() || DEF.settings.model, speak: $("#ss").checked,
      kinds: [...document.querySelectorAll("[data-k]")].filter(c => c.checked).map(c => c.dataset.k) });
    save(); go("bugun");
  };
  $("#cc").onclick = () => { db.chat = []; save(); alert("Sohbet temizlendi."); };
  $("#ex").onclick = exportData;
  $("#im").onclick = () => {
    const i = document.createElement("input"); i.type = "file"; i.accept = "application/json";
    i.onchange = async () => { try { const d = JSON.parse(await i.files[0].text()); d.settings = { ...db.settings, ...d.settings, apiKey: db.settings.apiKey }; db = { ...DEF, ...d }; save(); go("bugun"); } catch { alert("Dosya okunamadı."); } };
    i.click();
  };
}

// ---------- Başlangıç (Siri / kısayol bağlantıları) ----------
// Örnek: index.html#koc?q=Günümü planla  -> koç sekmesini açar ve soruyu sorar
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
const h = decodeURIComponent(location.hash.slice(1)), [ht, hq] = h.split("?q=");
go(views[ht] ? ht : "bugun");
if (hq) { history.replaceState(null, "", location.pathname); ask(hq); }
