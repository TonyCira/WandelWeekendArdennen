# Wandelweekend Ardennen — website

## LIVE
- Site: https://tonycira.github.io/WandelWeekendArdennen/ (GitHub Pages, branch main / root) — gelanceerd 27/10/2026, online gecontroleerd: alle 55 foto's, logo, achtergrond, grafiek, kosten OK
- Repo (publiek): https://github.com/TonyCira/WandelWeekendArdennen
- Gekozen voor publiek + enkel sfeerfoto's (omgeving/huisje, geen gezichten) i.p.v. private hosting met login (groep heeft geen goed wachtwoordbeleid)
- noindex-meta + robots.txt: niet in zoekmachines

## Update-workflow (PowerShell in projectmap)
1. Excel aanpassen/toevoegen in excel/ (opslaan in Excel) en/of foto's in assets/<weekend-id>/
2. `python tools/excel_naar_data.py`
3. `git add .` → `git status` (controleer: geen excel/, geen foto's met gezichten) → `git commit -m "..."` → `git push`
4. 1-2 min wachten, Ctrl+Shift+R
- Let op: wat ooit gecommit is blijft in de Git-geschiedenis zichtbaar

## Lokale projectmap
`C:\Users\Gebruiker\Documents\Developer\Websites\Website_WandelWeekendArdennen`
- `excel/` — template + kostenbestand per weekend (bron van alle data; .gitignore)
- `Claude outputs/`, `__pycache__/`, `plan-website.md` — ook in .gitignore (blijven lokaal)
- `tools/excel_naar_data.py` — Excels + foto's → `data/weekends.js`; fotopaden URL-encoded (quote) wegens spaties/haakjes in WhatsApp-bestandsnamen

## Weekends
| Weekend-ID | Status | Foto's |
|---|---|---|
| 2022-10-saint-hubert | afgerekend; geen werkende link huisje | 16 |
| 2023-10-stavelot | afgerekend | 13 |
| 2024-10-laroche | afgerekend | 9 |
| 2025-10-stoumont | afgerekend | 9 |
| 2026-10-saint-hubert | afrekening loopt | 8 |

Foto's gecontroleerd: geen GPS/EXIF, geen herkenbare gezichten. Geen page_pictures → logo-watermerk op weekendpagina's.
Nieuw jaar: kopie van Wandelweekend_Kosten_Template.xlsx → `JJJJ-MM-Plaats_Kosten.xlsx` → foto's in assets/<id>/ → script → push.

## Logo
- `assets/logo.svg` (zelf getekend): ronde badge, donkergroene ring "WANDELWEEKENDS"/"ARDENNEN", bergen, dennen, zon, wandelpad, wandelaar, "SINDS 2022"
- `assets/logo.png` 1024×1024 transparant (WhatsApp-profiel)
- In header (klikbaar), favicon, watermerk weekendpagina (opacity .07)

## Structuur
- `index.html` — kaarten per weekend + grafiek "Kosten per weekend" (gestapeld huisje #1d7a4e + overige #7fae2e)
- `weekend.html?id=<weekend-id>` — huisje, kosten, sfeerbeelden
- Kosten: tegels, balkjes per categorie, tabel per deelnemer (naam klikbaar → detail), Afrekening (rekening BE26 7350 0986 9029 = constante REKENING in script.js; knop "Toon wie betaalt aan wie"), Kosten in detail (uitklapbaar per categorie)
- Sfeerbeelden: galerij + lightbox
- Achtergrond: overzicht = assets/background-overzichtpagina.jpg; weekend = assets/<id>/page_picture.jpg indien aanwezig, anders logo
- Design: donkergroen #1f4d3a, veel wit, afgeronde kaders, hover lichtgroen #dcefd6

## Statistiekenpagina (stats.html + stats.js)
- Bereikbaar via knop "Meer statistieken" onder de grafiek op de overzichtspagina
- Kerncijfers, aftellen naar volgend weekend, kosten over de jaren (Chart.js, gestapeld per categorie, schakelaar Totaal / Per persoon per nacht, tabelweergave), records, aanwezigheid (ranking + matrix), persoonlijk overzicht (kies naam), kaart (Leaflet + OpenStreetMap, logo als pin), weer per weekend (Open-Meteo, live opgehaald)
- Categoriekleuren (gevalideerd): Huisje #1d7a4e, Eten #eda100, Drank #2a78d6, Activiteit #eb6834, Vervoer #6250d6, Andere #e87ba4
- `data/plaatsen.js` (handmatig): coördinaten per locatie (nieuwe plaats → regel toevoegen) + VOLGEND_WEEKEND (start/eind/plaats/voorlopig) voor het aftellen; nu voorlopig 22–25/10/2027
- Externe bibliotheken via cdnjs: Chart.js 4.4.1 (chart.umd.js), Leaflet 1.9.4

## Excel-structuur
- Info: Weekend-ID, naam, data, locatie, huisje, link, aantal personen*, totaal kosten*, waarvan vooraf betaald*, afrekening afgerond*, opmerkingen (* = automatisch)
- Deelnemers: naam, aantal nachten (mag decimaal)
- Kosten: Datum, Omschrijving, Categorie, Bedrag, Betaald door, Verdeling (Nachten/Gelijk), Vooraf betaald (Ja/Nee), Opmerking
- Afrekening: Naam, Nachten, Vooraf betaald €, Voorgeschoten €, Aandeel overige €, Saldo €, Status, Voldaan (Ja/Nee), Totale kost p.p. €

## Kostenregels
- Verdeling standaard naar nachten; optie "Gelijk"
- Huisje vooraf betaald: wel in totalen, niet in saldo
- Saldo = voorgeschoten − aandeel overige
- Voldaan = Ja → "Voldaan ✓"; iedereen Ja → afgerond
