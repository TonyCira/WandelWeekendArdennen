// Instellingen voor de statistiekenpagina (stats.html) — mag je met de hand aanpassen.

// Coördinaten per locatie (zoals in de Excel bij "Locatie"), voor de kaart en het weer.
// Nieuwe plaats? Voeg een regel toe: "Plaatsnaam": [breedtegraad, lengtegraad]
// (op Google Maps: rechtsklik op het dorp → de coördinaten verschijnen bovenaan)
window.PLAATSEN = {
  "Saint-Hubert":        [50.0266, 5.3739],
  "Stavelot":            [50.3945, 5.9310],
  "La Roche-en-Ardenne": [50.1830, 5.5760],
  "Stoumont":            [50.4064, 5.8090]
};

// Volgend weekend, voor het aftellen. voorlopig: true toont "datum nog te bevestigen".
window.VOLGEND_WEEKEND = {
  start: "2027-10-22",
  eind: "2027-10-25",
  plaats: "",
  voorlopig: true
};
