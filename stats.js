// ===== Statistieken over alle weekends heen (stats.html) =====
// Alle cijfers komen uit data/weekends.js (gemaakt door tools/excel_naar_data.py).

const euro = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const euroRond = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const getal = n => n.toLocaleString("nl-BE", { maximumFractionDigits: 1 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dag = d => new Date(d).toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short" });

// Weekends van oud naar nieuw, met afgeleide cijfers
const W = [...window.WEEKENDS].sort((a, b) => a.id.localeCompare(b.id)).map(w => {
  const nachten = w.start && w.eind ? Math.round((new Date(w.eind) - new Date(w.start)) / 864e5) : 0;
  const persoonsnachten = w.deelnemers.reduce((s, d) => s + d.nachten, 0);
  return { ...w, jaar: w.id.slice(0, 4), label: `${w.id.slice(0, 4)} ${w.locatie}`, nachten, persoonsnachten };
});

// Kleuren per categorie (gevalideerd op kleurenblindheid; Huisje = huisstijlgroen)
const CAT_KLEUR = { Huisje: "#1d7a4e", Eten: "#eda100", Drank: "#2a78d6", Activiteit: "#eb6834", Vervoer: "#6250d6", Andere: "#e87ba4" };
const CATEGORIEEN = Object.keys(CAT_KLEUR).filter(c => W.some(w => w.kosten.some(k => k.categorie === c)));
const GROEN = "#1f4d3a", GROEN_MID = "#3f7a5a";

// Alle namen, gesorteerd op aantal nachten (meeste eerst)
const PERSONEN = (() => {
  const p = {};
  W.forEach(w => w.deelnemers.forEach(d => {
    p[d.naam] ??= { naam: d.naam, weekends: 0, nachten: 0, kost: 0, voorgeschoten: 0, perJaar: {} };
    const x = p[d.naam];
    x.weekends++; x.nachten += d.nachten; x.kost += d.totaal;
    x.voorgeschoten += d.voorgeschoten;   // zonder vooraf betaalde kosten (huisje)
    x.perJaar[w.id] = d;
  }));
  return Object.values(p).sort((a, b) => b.nachten - a.nachten || b.weekends - a.weekends || a.naam.localeCompare(b.naam));
})();

// Chart.js: lettertype en kleuren van de site
if (window.Chart) {
  Chart.defaults.font.family = '"Segoe UI", Arial, sans-serif';
  Chart.defaults.color = "#5f6d64";
  Chart.defaults.plugins.tooltip.backgroundColor = "#ffffff";
  Chart.defaults.plugins.tooltip.titleColor = "#24312a";
  Chart.defaults.plugins.tooltip.bodyColor = "#24312a";
  Chart.defaults.plugins.tooltip.borderColor = "#d6e0d6";
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
}
const rasterKleur = "#e6ece6";

// Schakelaar-knoppen (Totaal / Per persoon per nacht, ...)
function schakelaar(id, bijWissel) {
  const groep = document.getElementById(id);
  groep.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    groep.querySelectorAll("button").forEach(x => x.classList.toggle("actief", x === b));
    bijWissel(b.dataset.modus);
  }));
}

// ===== 1. Kerncijfers =====
function toonKpi() {
  const totaal = W.reduce((s, w) => s + w.totaal, 0);
  const pn = W.reduce((s, w) => s + w.persoonsnachten, 0);
  const tegels = [
    ["Weekends", W.length],
    ["Nachten samen", W.reduce((s, w) => s + w.nachten, 0)],
    ["Verschillende wandelaars", PERSONEN.length],
    ["Totaal uitgegeven", euroRond.format(totaal)],
    ["Gemiddeld per persoon per nacht", euro.format(totaal / pn)],
  ];
  document.getElementById("kpi").innerHTML = tegels.map(([t, v]) => `<div class="tegel"><span>${t}</span><strong>${v}</strong></div>`).join("");
}

// ===== 2. Aftellen naar het volgende weekend =====
function toonAftellen() {
  const v = window.VOLGEND_WEEKEND, doel = document.getElementById("aftellen");
  if (!v || !v.start) { doel.hidden = true; return; }
  const start = new Date(v.start + "T15:00:00");   // vertrek vrijdagnamiddag
  const tik = () => {
    const ms = start - new Date();
    if (ms <= 0) { doel.innerHTML = `<h2>We zijn vertrokken! 🥾</h2>`; return; }
    const d = Math.floor(ms / 864e5), u = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
    doel.innerHTML = `
      <h2>Nog even geduld… 🥾</h2>
      <div class="teller">
        ${[[d, "dagen"], [u, "uren"], [m, "minuten"], [s, "seconden"]].map(([n, t]) => `<div><strong>${n}</strong><span>${t}</span></div>`).join("")}
      </div>
      <p class="voetnoot">tot het volgende weekend op ${new Date(v.start).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      ${v.plaats ? ` in ${esc(v.plaats)}` : ""}${v.voorlopig ? " (datum nog te bevestigen)" : ""}</p>`;
  };
  tik(); setInterval(tik, 1000);
}

// ===== 3. Kosten over de jaren (gestapeld per categorie) =====
function toonKosten() {
  const bedrag = (w, cat) => w.kosten.filter(k => k.categorie === cat).reduce((s, k) => s + k.bedrag, 0);
  const data = modus => CATEGORIEEN.map(cat => ({
    label: cat,
    data: W.map(w => modus === "ppn" ? bedrag(w, cat) / w.persoonsnachten : bedrag(w, cat)),
    backgroundColor: CAT_KLEUR[cat],
    borderColor: "#ffffff", borderWidth: { top: 2 }, borderRadius: 4, borderSkipped: false,
    maxBarThickness: 64,
  }));
  const grafiek = new Chart(document.getElementById("grafiek-kosten"), {
    type: "bar",
    data: { labels: W.map(w => [w.jaar, w.locatie]), datasets: data("totaal") },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, grid: { color: rasterKleur }, ticks: { callback: v => euroRond.format(v) } },
      },
      plugins: {
        legend: { position: "top", align: "start", labels: { boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 3 } },
        tooltip: {
          callbacks: {
            title: items => W[items[0].dataIndex].naam,
            label: c => c.raw ? ` ${c.dataset.label}: ${euro.format(c.raw)}` : null,
            footer: items => `Totaal: ${euro.format(items.reduce((s, i) => s + i.raw, 0))}`,
          },
        },
      },
      onClick: (e, el) => { if (el.length) location.href = `weekend.html?id=${W[el[0].index].id}`; },
    },
  });
  schakelaar("kosten-modus", modus => { grafiek.data.datasets = data(modus); grafiek.update(); tabel(modus); });

  // Tabelweergave (ook handig om exacte bedragen te zien)
  const tabel = modus => {
    const f = v => modus === "ppn" ? euro.format(v) : euroRond.format(v);
    document.getElementById("tabel-kosten").innerHTML = `
      <table class="tabel"><thead><tr><th>Categorie</th>${W.map(w => `<th class="getal">${w.jaar}</th>`).join("")}</tr></thead>
      <tbody>${CATEGORIEEN.map(cat => `<tr><td>${cat}</td>${W.map(w => `<td class="getal">${f(modus === "ppn" ? bedrag(w, cat) / w.persoonsnachten : bedrag(w, cat))}</td>`).join("")}</tr>`).join("")}
      <tr><td><strong>Totaal</strong></td>${W.map(w => `<td class="getal"><strong>${f(modus === "ppn" ? w.totaal / w.persoonsnachten : w.totaal)}</strong></td>`).join("")}</tr></tbody></table>`;
  };
  tabel("totaal");
}

// ===== 4. Records =====
function toonRecords() {
  const max = (lijst, f) => lijst.reduce((a, b) => f(b) > f(a) ? b : a);
  const min = (lijst, f) => lijst.reduce((a, b) => f(b) < f(a) ? b : a);
  const alleKosten = W.flatMap(w => w.kosten.map(k => ({ ...k, w })));
  const nietHuisje = alleKosten.filter(k => !k.vooraf);
  const duurst = max(W, w => w.totaal);
  const ppn = w => w.totaal / w.persoonsnachten;
  const goedkoopst = min(W, ppn), duurstPpn = max(W, ppn);
  const grootste = max(nietHuisje, k => k.bedrag);
  const huisjeDuurst = max(W, w => w.vooraf / w.persoonsnachten);
  const voorschieter = W.flatMap(w => w.deelnemers.map(d => ({ d, w }))).reduce((a, b) => b.d.voorgeschoten > a.d.voorgeschoten ? b : a);
  const drank = W.map(w => ({ w, v: w.kosten.filter(k => k.categorie === "Drank").reduce((s, k) => s + k.bedrag, 0) / w.persoonsnachten }));
  const dorstig = drank.reduce((a, b) => b.v > a.v ? b : a);
  const trouw = PERSONEN.filter(p => p.weekends === W.length).map(p => p.naam);
  const groot = max(W, w => w.deelnemers.length);

  const records = [
    ["💰", "Duurste weekend", euro.format(duurst.totaal), duurst.naam, duurst.id],
    ["📈", "Hoogste kost per persoon per nacht", euro.format(ppn(duurstPpn)), duurstPpn.naam, duurstPpn.id],
    ["🪙", "Voordeligste per persoon per nacht", euro.format(ppn(goedkoopst)), goedkoopst.naam, goedkoopst.id],
    ["🏠", "Duurste huisje per persoon per nacht", euro.format(huisjeDuurst.vooraf / huisjeDuurst.persoonsnachten), `${huisjeDuurst.huisje} · ${huisjeDuurst.jaar}`, huisjeDuurst.id],
    ["🧾", "Grootste uitgave (zonder huisje)", euro.format(grootste.bedrag), `${grootste.omschrijving} · ${grootste.betaaldDoor} · ${grootste.w.jaar}`, grootste.w.id],
    ["🏦", "Meeste voorgeschoten in één weekend", euro.format(voorschieter.d.voorgeschoten), `${voorschieter.d.naam} · ${voorschieter.w.jaar}`, voorschieter.w.id],
    ["🍺", "Dorstigste weekend (drank p.p. per nacht)", euro.format(dorstig.v), dorstig.w.naam, dorstig.w.id],
    ["👥", "Grootste groep", `${groot.deelnemers.length} wandelaars`, groot.naam, groot.id],
    ["🏅", "Altijd van de partij", trouw.length ? trouw.join(", ") : "niemand (nog)", `alle ${W.length} weekends mee`, null],
  ];
  document.getElementById("records").innerHTML = records.map(([icoon, titel, waarde, sub, id]) => `
    <${id ? `a href="weekend.html?id=${id}"` : "div"} class="record">
      <span class="record-icoon" aria-hidden="true">${icoon}</span>
      <span class="record-titel">${titel}</span>
      <strong>${esc(waarde)}</strong>
      <span class="record-sub">${esc(sub)}</span>
    </${id ? "a" : "div"}>`).join("");
}

// ===== 5. Aanwezigheid =====
function toonAanwezigheid() {
  const data = modus => PERSONEN.map(p => modus === "weekends" ? p.weekends : p.nachten);
  const grafiek = new Chart(document.getElementById("grafiek-aanwezig"), {
    type: "bar",
    data: { labels: PERSONEN.map(p => p.naam), datasets: [{ label: "Nachten", data: data("nachten"), backgroundColor: GROEN_MID, hoverBackgroundColor: GROEN, borderRadius: 4, maxBarThickness: 26 }] },
    options: {
      indexAxis: "y", maintainAspectRatio: false,
      scales: { x: { grid: { color: rasterKleur }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${getal(c.raw)} ${c.dataset.label.toLowerCase()}` } },
      },
      onClick: (e, el) => { if (el.length) kiesPersoon(PERSONEN[el[0].index].naam, true); },
    },
  });
  schakelaar("aanw-modus", modus => {
    grafiek.data.datasets[0].data = data(modus);
    grafiek.data.datasets[0].label = modus === "weekends" ? "Weekends" : "Nachten";
    grafiek.update();
  });

  // Matrix: wie was wanneer mee (aantal nachten)
  document.getElementById("matrix").innerHTML = `
    <table class="tabel matrix">
      <thead><tr><th>Naam</th>${W.map(w => `<th title="${esc(w.naam)}">${w.jaar}<br><small>${esc(w.locatie)}</small></th>`).join("")}<th class="getal">Totaal</th></tr></thead>
      <tbody>${PERSONEN.map(p => `<tr><td><strong>${esc(p.naam)}</strong></td>${W.map(w => {
        const d = p.perJaar[w.id];
        return d ? `<td class="mee" title="${getal(d.nachten)} nachten">✓<small>${getal(d.nachten)}</small></td>` : `<td class="niet">–</td>`;
      }).join("")}<td class="getal">${p.weekends}× · ${getal(p.nachten)} n.</td></tr>`).join("")}</tbody>
    </table>
    <p class="voetnoot">✓ = mee, het kleine getal is het aantal nachten.</p>`;
}

// ===== 6. Persoonlijk overzicht =====
let persoonGrafiek;
function toonNamen() {
  document.getElementById("namen").innerHTML = PERSONEN.map(p => `<button class="naam-knop" data-naam="${esc(p.naam)}">${esc(p.naam)}</button>`).join("");
  document.querySelectorAll("#namen .naam-knop").forEach(b => b.addEventListener("click", () => kiesPersoon(b.dataset.naam)));
  kiesPersoon(PERSONEN[0].naam);
}

function kiesPersoon(naam, scroll) {
  const p = PERSONEN.find(x => x.naam === naam);
  document.querySelectorAll("#namen .naam-knop").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.naam === naam)));
  const rang = PERSONEN.indexOf(p) + 1;
  document.getElementById("persoon").innerHTML = `
    <div class="tegels tegels-3">
      <div class="tegel"><span>Weekends mee</span><strong>${p.weekends} / ${W.length}</strong></div>
      <div class="tegel"><span>Nachten</span><strong>${getal(p.nachten)}</strong></div>
      <div class="tegel"><span>Totaal betaald (alle weekends)</span><strong>${euro.format(p.kost)}</strong></div>
      <div class="tegel"><span>Gemiddeld per nacht</span><strong>${euro.format(p.kost / p.nachten)}</strong></div>
      <div class="tegel"><span>Ooit voorgeschoten</span><strong>${euro.format(p.voorgeschoten)}</strong></div>
      <div class="tegel"><span>Plaats in de aanwezigheid</span><strong>#${rang}</strong></div>
    </div>
    <h3>Kost per weekend voor ${esc(p.naam)}</h3>
    <div class="grafiek-houder grafiek-laag"><canvas id="grafiek-persoon"></canvas></div>`;
  persoonGrafiek?.destroy();
  persoonGrafiek = new Chart(document.getElementById("grafiek-persoon"), {
    type: "bar",
    data: {
      labels: W.map(w => [w.jaar, w.locatie]),
      datasets: [
        { label: "Deel huisje", data: W.map(w => p.perJaar[w.id]?.vooraf ?? 0), backgroundColor: CAT_KLEUR.Huisje, borderRadius: 4, borderColor: "#fff", borderWidth: { top: 2 }, borderSkipped: false, maxBarThickness: 56 },
        { label: "Aandeel overige kosten", data: W.map(w => p.perJaar[w.id]?.aandeel ?? 0), backgroundColor: "#7fae2e", borderRadius: 4, borderColor: "#fff", borderWidth: { top: 2 }, borderSkipped: false, maxBarThickness: 56 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: rasterKleur }, ticks: { callback: v => euroRond.format(v) } } },
      plugins: {
        legend: { position: "top", align: "start", labels: { boxWidth: 12, boxHeight: 12, useBorderRadius: true, borderRadius: 3 } },
        tooltip: { callbacks: {
          title: items => W[items[0].dataIndex].naam,
          label: c => ` ${c.dataset.label}: ${euro.format(c.raw)}`,
          footer: items => p.perJaar[W[items[0].dataIndex].id] ? `Totaal: ${euro.format(items.reduce((s, i) => s + i.raw, 0))}` : "Niet mee",
        } },
      },
    },
  });
  if (scroll) document.getElementById("namen").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ===== 7. Kaart =====
function toonKaart() {
  const doel = document.getElementById("kaart-ardennen");
  if (!window.L) { doel.innerHTML = '<p class="binnenkort">De kaart kon niet geladen worden.</p>'; return; }
  const kaart = L.map(doel, { scrollWheelZoom: false });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 15, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(kaart);
  const icoon = L.divIcon({ className: "pin", html: '<img src="assets/logo.svg" alt="">', iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -18] });
  const perPlaats = {};
  W.forEach(w => (perPlaats[w.locatie] ??= []).push(w));
  const punten = [];
  Object.entries(perPlaats).forEach(([plaats, lijst]) => {
    const c = window.PLAATSEN?.[plaats];
    if (!c) return;   // plaats zonder coördinaten in data/plaatsen.js
    punten.push(c);
    L.marker(c, { icon: icoon, title: plaats }).addTo(kaart).bindPopup(`
      <strong>${esc(plaats)}</strong><br>
      ${lijst.map(w => `<a href="weekend.html?id=${w.id}">${w.jaar} · ${esc(w.huisje)}</a> — ${euroRond.format(w.totaal)}`).join("<br>")}`);
  });
  kaart.fitBounds(punten, { padding: [50, 50], maxZoom: 10 });
}

// ===== 8. Weer (Open-Meteo, gratis, geen sleutel nodig) =====
async function weerVan(w) {
  const c = window.PLAATSEN?.[w.locatie];
  if (!c || !w.start || !w.eind) return null;
  const q = `latitude=${c[0]}&longitude=${c[1]}&start_date=${w.start}&end_date=${w.eind}` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=Europe%2FBrussels`;
  // Archief voor oudere weekends; voor recente dagen heeft enkel de gewone API al data
  for (const basis of ["https://archive-api.open-meteo.com/v1/archive", "https://api.open-meteo.com/v1/forecast"]) {
    try {
      const r = await fetch(`${basis}?${q}`);
      if (!r.ok) continue;
      const j = await r.json();
      if (j.daily?.temperature_2m_max?.every(v => v !== null)) return j.daily;
    } catch (e) { /* volgende bron proberen */ }
  }
  return null;
}

const weerIcoon = code => code >= 95 ? "⛈️" : code >= 71 && code <= 86 ? "🌨️" : code >= 51 ? "🌧️" : code >= 45 ? "🌫️" : code >= 3 ? "☁️" : code >= 1 ? "⛅" : "☀️";

async function toonWeer() {
  const doel = document.getElementById("weer");
  doel.innerHTML = '<p class="binnenkort">Weer wordt geladen…</p>';
  const resultaten = await Promise.all(W.map(weerVan));
  const met = W.map((w, i) => ({ w, d: resultaten[i] })).filter(x => x.d);
  if (!met.length) { doel.innerHTML = '<p class="binnenkort">Weergegevens konden niet geladen worden.</p>'; return; }
  const regen = x => x.d.precipitation_sum.reduce((s, v) => s + v, 0);
  const warm = x => Math.max(...x.d.temperature_2m_max);
  const natst = met.reduce((a, b) => regen(b) > regen(a) ? b : a);
  const droogst = met.reduce((a, b) => regen(b) < regen(a) ? b : a);
  const warmst = met.reduce((a, b) => warm(b) > warm(a) ? b : a);
  doel.innerHTML = [...met].reverse().map(x => `
    <div class="weer-kaart">
      <div class="weer-kop">
        <a href="weekend.html?id=${x.w.id}"><strong>${x.w.jaar} · ${esc(x.w.locatie)}</strong></a>
        <span>
          ${x === natst ? '<span class="label label-open">natste</span>' : ""}
          ${x === droogst ? '<span class="label label-ok">droogste</span>' : ""}
          ${x === warmst ? '<span class="label label-ok">warmste</span>' : ""}
        </span>
      </div>
      <div class="weer-dagen">
        ${x.d.time.map((t, i) => `
          <div class="weer-dag">
            <span>${dag(t)}</span>
            <span class="weer-icoon">${weerIcoon(x.d.weather_code[i])}</span>
            <strong>${Math.round(x.d.temperature_2m_max[i])}°</strong>
            <small>${Math.round(x.d.temperature_2m_min[i])}° · ${getal(x.d.precipitation_sum[i])} mm</small>
          </div>`).join("")}
      </div>
      <p class="voetnoot">Totaal ${getal(regen(x))} mm regen</p>
    </div>`).join("");
}

// ===== Starten =====
toonKpi();
toonAftellen();
if (window.Chart) { toonKosten(); toonAanwezigheid(); }
toonRecords();
if (window.Chart) toonNamen();
toonKaart();
toonWeer();
