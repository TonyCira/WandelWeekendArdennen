// ===== Instellingen =====
const REKENING = "BE26 7350 0986 9029";   // rekening voor de afrekening

// ===== Hulpfuncties =====
const euro = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const euroRond = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const datum = d => new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
const nachten = n => Number.isInteger(n) ? n : n.toLocaleString("nl-BE");

// Periode tonen; zonder datums: maand + jaar uit de Weekend-ID (bv. 2025-10 → oktober 2025)
function periode(w) {
  if (w.start && w.eind) return `${datum(w.start)} – ${datum(w.eind)}`;
  const [j, m] = w.id.split("-");
  return new Date(+j, +m - 1, 1).toLocaleDateString("nl-BE", { month: "long", year: "numeric" });
}

const statusLabel = w => w.afgerond
  ? '<span class="label label-ok">Afgerekend ✓</span>'
  : '<span class="label label-open">Afrekening loopt</span>';

// Wie betaalt aan wie: grootste schuldenaar betaalt aan grootste schuldeiser, tot alles 0 is
function overschrijvingen(deelnemers) {
  const debet = deelnemers.filter(d => d.saldo < -0.005).map(d => ({ ...d, rest: -d.saldo })).sort((a, b) => b.rest - a.rest);
  const credit = deelnemers.filter(d => d.saldo > 0.005).map(d => ({ ...d, rest: d.saldo })).sort((a, b) => b.rest - a.rest);
  const lijst = [];
  let i = 0, j = 0;
  while (i < debet.length && j < credit.length) {
    const bedrag = Math.min(debet[i].rest, credit[j].rest);
    lijst.push({ van: debet[i].naam, aan: credit[j].naam, bedrag, voldaan: debet[i].voldaan });
    debet[i].rest -= bedrag; credit[j].rest -= bedrag;
    if (debet[i].rest < 0.005) i++;
    if (credit[j].rest < 0.005) j++;
  }
  return lijst;
}

// ===== Overzichtspagina (index.html) =====
const lijst = document.getElementById("weekend-lijst");
if (lijst) {
  const weekends = [...window.WEEKENDS].sort((a, b) => b.id.localeCompare(a.id)); // nieuwste eerst
  lijst.innerHTML = weekends.map(w => `
    <a class="weekend-kaart" href="weekend.html?id=${encodeURIComponent(w.id)}">
      ${statusLabel(w)}
      <h3>${esc(w.naam)}</h3>
      <div class="datum">${periode(w)} · ${esc(w.locatie)}</div>
      <div class="details">
        <span>👥 ${w.deelnemers.length} deelnemers</span>
        <span>💶 ${euro.format(w.totaal)}</span>
      </div>
      <span class="meer">Bekijk weekend →</span>
    </a>`).join("");
  toonGrafiek();
}

// Gestapelde staafgrafiek: per weekend huisje + overige kosten
function toonGrafiek() {
  const doel = document.getElementById("grafiek");
  if (!doel) return;
  const weekends = [...window.WEEKENDS].sort((a, b) => a.id.localeCompare(b.id)); // oud → nieuw
  const stap = 1000;
  const top = Math.ceil(Math.max(...weekends.map(w => w.totaal)) / stap) * stap;
  const pct = v => (v / top * 100).toFixed(2) + "%";
  const lijnen = [];
  for (let v = 0; v <= top; v += stap) lijnen.push(`<div class="g-lijn" style="bottom:${pct(v)}"><span>${euroRond.format(v)}</span></div>`);

  doel.innerHTML = `
    <div class="g-legende">
      <span><i class="g-huisje"></i>Huisje (vooraf)</span>
      <span><i class="g-overige"></i>Overige kosten</span>
    </div>
    <div class="g-vlak">
      ${lijnen.join("")}
      <div class="g-kolommen">
        ${weekends.map(w => `
          <a class="g-kolom" href="weekend.html?id=${encodeURIComponent(w.id)}"
             data-tip="<strong>${esc(w.naam)}</strong><br>Huisje: ${euro.format(w.vooraf)}<br>Overige: ${euro.format(w.totaal - w.vooraf)}<br>Totaal: ${euro.format(w.totaal)}<br>Gemiddeld p.p.: ${euro.format(w.totaal / w.deelnemers.length)}">
            <span class="g-staaf" style="height:${pct(w.totaal)}">
              <span class="g-totaal">${euroRond.format(w.totaal)}</span>
              <span class="g-overige" style="flex:${w.totaal - w.vooraf}"></span>
              <span class="g-huisje" style="flex:${w.vooraf}"></span>
            </span>
          </a>`).join("")}
      </div>
    </div>
    <div class="g-labels">${weekends.map(w => `<span><strong>${w.id.slice(0, 4)}</strong><br>${esc(w.locatie)}</span>`).join("")}</div>
    <div class="g-tip" hidden></div>`;

  // Tooltip bij hover
  const tip = doel.querySelector(".g-tip");
  doel.querySelectorAll(".g-kolom").forEach(k => {
    k.addEventListener("mouseenter", () => { tip.innerHTML = k.dataset.tip; tip.hidden = false; });
    k.addEventListener("mousemove", e => {
      const r = doel.getBoundingClientRect();
      const x = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 4);
      tip.style.left = x + "px"; tip.style.top = (e.clientY - r.top - tip.offsetHeight - 10) + "px";
    });
    k.addEventListener("mouseleave", () => tip.hidden = true);
  });
}

// ===== Detailpagina (weekend.html?id=...) =====
if (document.getElementById("weekend-detail")) {
  const id = new URLSearchParams(location.search).get("id");
  const w = window.WEEKENDS.find(x => x.id === id);
  if (!w) {
    document.getElementById("titel").textContent = "Weekend niet gevonden";
  } else {
    // Achtergrond: page_picture.jpg van het weekend, anders het logo als watermerk
    if (w.achtergrond) document.body.style.setProperty("--achtergrond-foto", `url("${w.achtergrond}")`);
    else document.body.classList.add("met-logo");
    toonHuisje(w);
    toonKosten(w);
    toonFotos(w);
  }
}

function toonHuisje(w) {
  document.title = `${w.naam} — Wandelweekends Ardennen`;
  document.getElementById("titel").textContent = w.naam;
  document.getElementById("subtitel").textContent = `${periode(w)} · ${w.locatie}`;
  document.getElementById("info").innerHTML = `
    <dt>Huisje</dt><dd>${esc(w.huisje)}</dd>
    <dt>Locatie</dt><dd>${esc(w.locatie)}</dd>
    <dt>Periode</dt><dd>${periode(w)}</dd>
    <dt>Deelnemers</dt><dd>${w.deelnemers.map(d => esc(d.naam)).join(", ")}</dd>
    ${w.opmerkingen ? `<dt>Opmerking</dt><dd>${esc(w.opmerkingen)}</dd>` : ""}`;
  const knop = document.getElementById("link-huisje");
  if (w.linkHuisje) knop.href = w.linkHuisje;
  else knop.outerHTML = `<span class="binnenkort">Link naar het huisje: ${esc(w.linkOpmerking || "niet beschikbaar")}</span>`;
}

function toonKosten(w) {
  const overige = w.totaal - w.vooraf;

  // Tegels met totalen
  const tegels = `
    <div class="tegels">
      <div class="tegel"><span>Totale kosten</span><strong>${euro.format(w.totaal)}</strong></div>
      <div class="tegel"><span>Huisje (vooraf betaald)</span><strong>${euro.format(w.vooraf)}</strong></div>
      <div class="tegel"><span>Overige kosten</span><strong>${euro.format(overige)}</strong></div>
      <div class="tegel"><span>Gemiddeld per persoon</span><strong>${euro.format(w.totaal / w.deelnemers.length)}</strong></div>
    </div>`;

  // Kosten per categorie (balkjes)
  const perCat = {};
  w.kosten.forEach(k => perCat[k.categorie] = (perCat[k.categorie] || 0) + k.bedrag);
  const max = Math.max(...Object.values(perCat));
  const categorieen = Object.entries(perCat).sort((a, b) => b[1] - a[1]).map(([cat, bedrag]) => `
    <div class="balk-rij">
      <span class="balk-naam">${esc(cat)}</span>
      <span class="balk"><span style="width:${(bedrag / max * 100).toFixed(1)}%"></span></span>
      <span class="balk-bedrag">${euro.format(bedrag)}</span>
    </div>`).join("");

  // Deelnemers: klik op een naam voor het detail
  const rijen = w.deelnemers.map((d, i) => `
    <tr>
      <td><button class="naam-knop" data-i="${i}" aria-expanded="false">${esc(d.naam)}</button></td>
      <td class="getal">${nachten(d.nachten)}</td>
      <td class="getal">${euro.format(d.totaal)}</td>
      <td class="getal ${d.saldo > 0.005 ? "plus" : d.saldo < -0.005 ? "min" : ""}">${euro.format(d.saldo)}</td>
      <td>${d.voldaan ? "✓ voldaan" : d.saldo > 0.005 ? "krijgt terug" : d.saldo < -0.005 ? "moet betalen" : "in orde"}</td>
    </tr>
    <tr class="detail-rij" id="detail-${i}" hidden><td colspan="5">${persoonDetail(w, d)}</td></tr>`).join("");

  // Wie betaalt aan wie
  const lijst = overschrijvingen(w.deelnemers);
  const transfers = lijst.length ? `
    <ul class="transfers" id="transfers" hidden>${lijst.map(t => `
      <li class="${t.voldaan ? "gedaan" : ""}">
        <strong>${esc(t.van)}</strong> → <strong>${esc(t.aan)}</strong>
        <span class="getal">${euro.format(t.bedrag)}</span>
        ${t.voldaan ? '<span class="label label-ok">betaald ✓</span>' : ""}
      </li>`).join("")}
    </ul>` : "";
  const afrekening = `
    <div class="melding ${w.afgerond ? "melding-ok" : ""}">
      ${w.afgerond
        ? "<p><strong>Dit weekend is volledig afgerekend ✓</strong></p>"
        : `<p>Gelieve op volgende rekening <strong class="rekening">${REKENING}</strong> jullie openstaande saldo te betalen.</p>
           <p>De personen die terug krijgen zullen daags hun saldo zien verschijnen op hun bankrekening.</p>`}
      ${lijst.length ? '<button class="knop" id="toon-transfers" aria-expanded="false">Toon wie betaalt aan wie</button>' : ""}
    </div>
    ${transfers}`;

  // Alle kosten
  // Kosten in detail: één uitklapbaar blok per categorie
  const detailPerCat = Object.entries(perCat).sort((a, b) => b[1] - a[1]).map(([cat, bedrag]) => {
    const items = w.kosten.filter(k => k.categorie === cat);
    return `
    <details class="categorie">
      <summary><span>${esc(cat)} <small>(${items.length})</small></span><span class="getal">${euro.format(bedrag)}</span></summary>
      <div class="tabel-wrap"><table class="tabel">
        <thead><tr><th>Datum</th><th>Omschrijving</th><th>Betaald door</th><th class="getal">Bedrag</th></tr></thead>
        <tbody>${items.map(k => `
          <tr>
            <td>${k.datum ? new Date(k.datum).toLocaleDateString("nl-BE") : ""}</td>
            <td>${esc(k.omschrijving)} ${k.vooraf ? '<span class="label">vooraf</span>' : ""}</td>
            <td>${esc(k.betaaldDoor)}</td>
            <td class="getal">${euro.format(k.bedrag)}</td>
          </tr>`).join("")}</tbody>
      </table></div>
    </details>`;
  }).join("");

  document.getElementById("kosten").innerHTML = `
    <div class="kaart-kop"><h2>Kosten</h2>${statusLabel(w)}</div>
    ${tegels}

    <h3>Per categorie</h3>
    <div class="balken">${categorieen}</div>

    <h3>Per deelnemer <small>— klik op een naam voor het detail</small></h3>
    <div class="tabel-wrap"><table class="tabel tabel-deelnemers">
      <thead><tr><th>Naam</th><th class="getal">Nachten</th><th class="getal">Totale kost</th><th class="getal">Saldo</th><th>Status</th></tr></thead>
      <tbody>${rijen}</tbody>
    </table></div>
    <p class="voetnoot">Saldo = wat je tijdens het weekend voorschoot min je aandeel in de overige kosten. Het huisje is vooraf betaald en telt niet mee.</p>

    <h3>Afrekening</h3>
    ${afrekening}

    <h3>Kosten in detail <small>— klik op een categorie</small></h3>
    ${detailPerCat}`;

  // Knop: wie betaalt aan wie tonen of verbergen
  const knopT = document.getElementById("toon-transfers");
  if (knopT) knopT.addEventListener("click", () => {
    const ul = document.getElementById("transfers");
    ul.hidden = !ul.hidden;
    knopT.setAttribute("aria-expanded", String(!ul.hidden));
    knopT.textContent = ul.hidden ? "Toon wie betaalt aan wie" : "Verberg wie betaalt aan wie";
  });

  // Klik op naam: detail openen of sluiten
  document.querySelectorAll(".naam-knop").forEach(knop => knop.addEventListener("click", () => {
    const rij = document.getElementById(`detail-${knop.dataset.i}`);
    rij.hidden = !rij.hidden;
    knop.setAttribute("aria-expanded", String(!rij.hidden));
  }));
}

function persoonDetail(w, d) {
  const betaald = w.kosten.filter(k => k.betaaldDoor === d.naam && !k.vooraf);
  return `
    <div class="persoon">
      <dl class="info">
        <dt>Nachten aanwezig</dt><dd>${nachten(d.nachten)}</dd>
        <dt>Deel huisje (vooraf)</dt><dd>${euro.format(d.vooraf)}</dd>
        <dt>Aandeel overige kosten</dt><dd>${euro.format(d.aandeel)}</dd>
        <dt>Totale kost weekend</dt><dd>${euro.format(d.totaal)}</dd>
        <dt>Voorgeschoten</dt><dd>${euro.format(d.voorgeschoten)}</dd>
        <dt>Saldo</dt><dd class="${d.saldo > 0.005 ? "plus" : d.saldo < -0.005 ? "min" : ""}">${euro.format(d.saldo)}</dd>
      </dl>
      ${betaald.length ? `<p><strong>Voorgeschoten voor:</strong> ${betaald.map(k => `${esc(k.omschrijving)} (${euro.format(k.bedrag)})`).join(", ")}</p>` : ""}
    </div>`;
}

// ===== Sfeerbeelden: galerij + groot bekijken =====
function toonFotos(w) {
  const sectie = document.getElementById("sfeer");
  if (!w.fotos.length) {
    sectie.innerHTML = '<h2>Sfeerbeelden</h2><p class="binnenkort">Foto\'s volgen.</p>';
    return;
  }
  sectie.innerHTML = `
    <h2>Sfeerbeelden <small class="voetnoot">(${w.fotos.length} foto's — klik om te vergroten)</small></h2>
    <div class="galerij">
      ${w.fotos.map((f, i) => `<button data-i="${i}" aria-label="Foto ${i + 1} vergroten"><img src="${f}" alt="Sfeerbeeld ${i + 1}" loading="lazy"></button>`).join("")}
    </div>
    <div class="lightbox" hidden>
      <button class="lb-knop lb-sluit" aria-label="Sluiten">✕</button>
      <button class="lb-knop lb-vorige" aria-label="Vorige foto">‹</button>
      <img alt="">
      <button class="lb-knop lb-volgende" aria-label="Volgende foto">›</button>
      <span class="lb-teller"></span>
    </div>`;

  const lb = sectie.querySelector(".lightbox");
  const img = lb.querySelector("img");
  let huidig = 0;
  const toon = i => {
    huidig = (i + w.fotos.length) % w.fotos.length;   // rondlopen
    img.src = w.fotos[huidig];
    lb.querySelector(".lb-teller").textContent = `${huidig + 1} / ${w.fotos.length}`;
  };
  const sluit = () => { lb.hidden = true; document.body.style.overflow = ""; };

  sectie.querySelectorAll(".galerij button").forEach(b => b.addEventListener("click", () => {
    toon(+b.dataset.i); lb.hidden = false; document.body.style.overflow = "hidden";
  }));
  lb.querySelector(".lb-sluit").onclick = sluit;
  lb.querySelector(".lb-vorige").onclick = () => toon(huidig - 1);
  lb.querySelector(".lb-volgende").onclick = () => toon(huidig + 1);
  lb.addEventListener("click", e => { if (e.target === lb) sluit(); });   // klik naast de foto
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") sluit();
    if (e.key === "ArrowLeft") toon(huidig - 1);
    if (e.key === "ArrowRight") toon(huidig + 1);
  });
  // vegen op gsm
  let startX = null;
  lb.addEventListener("touchstart", e => startX = e.touches[0].clientX, { passive: true });
  lb.addEventListener("touchend", e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) toon(huidig + (dx < 0 ? 1 : -1));
    startX = null;
  });
}
