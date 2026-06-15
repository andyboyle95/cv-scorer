// Generates fixtures.json for the WC2026 Captain Planner.
//
// Source data: 2026 FIFA World Cup group stage (Wikipedia, cross-checked),
// stored as venue LOCAL time + UTC offset. kickoff_utc is computed
// deterministically here so the arithmetic is auditable and correct across
// the ET/CT/MT/PT/Mexico time zones (all June 2026 offsets are negative).
//
// To update: edit GROUPS / SOURCE below, then run `node build-fixtures.js`.

const fs = require("fs");
const path = require("path");

// 12 groups of 4. Team names here MUST match those used in SOURCE exactly.
const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

// [group, date, localTime(24h "HH:MM"), utcOffset(hours, negative), home, away, city, venue]
const SOURCE = [
  // Group A
  ["A", "2026-06-11", "13:00", -6, "Mexico", "South Africa", "Mexico City", "Estadio Azteca"],
  ["A", "2026-06-11", "20:00", -6, "South Korea", "Czech Republic", "Zapopan", "Estadio Akron"],
  ["A", "2026-06-18", "12:00", -4, "Czech Republic", "South Africa", "Atlanta", "Mercedes-Benz Stadium"],
  ["A", "2026-06-18", "19:00", -6, "Mexico", "South Korea", "Zapopan", "Estadio Akron"],
  ["A", "2026-06-24", "19:00", -6, "Czech Republic", "Mexico", "Mexico City", "Estadio Azteca"],
  ["A", "2026-06-24", "19:00", -6, "South Africa", "South Korea", "Guadalupe", "Estadio BBVA"],
  // Group B
  ["B", "2026-06-12", "15:00", -4, "Canada", "Bosnia and Herzegovina", "Toronto", "BMO Field"],
  ["B", "2026-06-13", "12:00", -7, "Qatar", "Switzerland", "Santa Clara", "Levi's Stadium"],
  ["B", "2026-06-18", "12:00", -7, "Switzerland", "Bosnia and Herzegovina", "Inglewood", "SoFi Stadium"],
  ["B", "2026-06-18", "15:00", -7, "Canada", "Qatar", "Vancouver", "BC Place"],
  ["B", "2026-06-24", "12:00", -7, "Switzerland", "Canada", "Vancouver", "BC Place"],
  ["B", "2026-06-24", "12:00", -7, "Bosnia and Herzegovina", "Qatar", "Seattle", "Lumen Field"],
  // Group C
  ["C", "2026-06-13", "18:00", -4, "Brazil", "Morocco", "East Rutherford", "MetLife Stadium"],
  ["C", "2026-06-13", "21:00", -4, "Haiti", "Scotland", "Foxborough", "Gillette Stadium"],
  ["C", "2026-06-19", "18:00", -4, "Scotland", "Morocco", "Foxborough", "Gillette Stadium"],
  ["C", "2026-06-19", "20:30", -4, "Brazil", "Haiti", "Philadelphia", "Lincoln Financial Field"],
  ["C", "2026-06-24", "18:00", -4, "Scotland", "Brazil", "Miami Gardens", "Hard Rock Stadium"],
  ["C", "2026-06-24", "18:00", -4, "Morocco", "Haiti", "Atlanta", "Mercedes-Benz Stadium"],
  // Group D
  ["D", "2026-06-12", "18:00", -7, "United States", "Paraguay", "Inglewood", "SoFi Stadium"],
  ["D", "2026-06-13", "21:00", -7, "Australia", "Turkey", "Vancouver", "BC Place"],
  ["D", "2026-06-19", "12:00", -7, "United States", "Australia", "Seattle", "Lumen Field"],
  ["D", "2026-06-19", "20:00", -7, "Turkey", "Paraguay", "Santa Clara", "Levi's Stadium"],
  ["D", "2026-06-25", "19:00", -7, "Turkey", "United States", "Inglewood", "SoFi Stadium"],
  ["D", "2026-06-25", "19:00", -7, "Paraguay", "Australia", "Santa Clara", "Levi's Stadium"],
  // Group E
  ["E", "2026-06-14", "12:00", -5, "Germany", "Curaçao", "Houston", "NRG Stadium"],
  ["E", "2026-06-14", "19:00", -4, "Ivory Coast", "Ecuador", "Philadelphia", "Lincoln Financial Field"],
  ["E", "2026-06-20", "16:00", -4, "Germany", "Ivory Coast", "Toronto", "BMO Field"],
  ["E", "2026-06-20", "19:00", -5, "Ecuador", "Curaçao", "Kansas City", "Arrowhead Stadium"],
  ["E", "2026-06-25", "16:00", -4, "Curaçao", "Ivory Coast", "Philadelphia", "Lincoln Financial Field"],
  ["E", "2026-06-25", "16:00", -4, "Ecuador", "Germany", "East Rutherford", "MetLife Stadium"],
  // Group F
  ["F", "2026-06-14", "15:00", -5, "Netherlands", "Japan", "Arlington", "AT&T Stadium"],
  ["F", "2026-06-14", "20:00", -6, "Sweden", "Tunisia", "Guadalupe", "Estadio BBVA"],
  ["F", "2026-06-20", "12:00", -5, "Netherlands", "Sweden", "Houston", "NRG Stadium"],
  ["F", "2026-06-20", "22:00", -6, "Tunisia", "Japan", "Guadalupe", "Estadio BBVA"],
  ["F", "2026-06-25", "18:00", -5, "Japan", "Sweden", "Arlington", "AT&T Stadium"],
  ["F", "2026-06-25", "18:00", -5, "Tunisia", "Netherlands", "Kansas City", "Arrowhead Stadium"],
  // Group G
  ["G", "2026-06-15", "12:00", -7, "Belgium", "Egypt", "Seattle", "Lumen Field"],
  ["G", "2026-06-15", "18:00", -7, "Iran", "New Zealand", "Inglewood", "SoFi Stadium"],
  ["G", "2026-06-21", "12:00", -7, "Belgium", "Iran", "Inglewood", "SoFi Stadium"],
  ["G", "2026-06-21", "18:00", -7, "New Zealand", "Egypt", "Vancouver", "BC Place"],
  ["G", "2026-06-26", "20:00", -7, "Egypt", "Iran", "Seattle", "Lumen Field"],
  ["G", "2026-06-26", "20:00", -7, "New Zealand", "Belgium", "Vancouver", "BC Place"],
  // Group H
  ["H", "2026-06-15", "12:00", -4, "Spain", "Cape Verde", "Atlanta", "Mercedes-Benz Stadium"],
  ["H", "2026-06-15", "18:00", -4, "Saudi Arabia", "Uruguay", "Miami Gardens", "Hard Rock Stadium"],
  ["H", "2026-06-21", "12:00", -4, "Spain", "Saudi Arabia", "Atlanta", "Mercedes-Benz Stadium"],
  ["H", "2026-06-21", "18:00", -4, "Uruguay", "Cape Verde", "Miami Gardens", "Hard Rock Stadium"],
  ["H", "2026-06-26", "19:00", -5, "Cape Verde", "Saudi Arabia", "Houston", "NRG Stadium"],
  ["H", "2026-06-26", "18:00", -6, "Uruguay", "Spain", "Zapopan", "Estadio Akron"],
  // Group I
  ["I", "2026-06-16", "15:00", -4, "France", "Senegal", "East Rutherford", "MetLife Stadium"],
  ["I", "2026-06-16", "18:00", -4, "Iraq", "Norway", "Foxborough", "Gillette Stadium"],
  ["I", "2026-06-22", "17:00", -4, "France", "Iraq", "Philadelphia", "Lincoln Financial Field"],
  ["I", "2026-06-22", "20:00", -4, "Norway", "Senegal", "East Rutherford", "MetLife Stadium"],
  ["I", "2026-06-26", "15:00", -4, "Norway", "France", "Foxborough", "Gillette Stadium"],
  ["I", "2026-06-26", "15:00", -4, "Senegal", "Iraq", "Toronto", "BMO Field"],
  // Group J
  ["J", "2026-06-16", "20:00", -5, "Argentina", "Algeria", "Kansas City", "Arrowhead Stadium"],
  ["J", "2026-06-16", "21:00", -7, "Austria", "Jordan", "Santa Clara", "Levi's Stadium"],
  ["J", "2026-06-22", "12:00", -5, "Argentina", "Austria", "Arlington", "AT&T Stadium"],
  ["J", "2026-06-22", "20:00", -7, "Jordan", "Algeria", "Santa Clara", "Levi's Stadium"],
  ["J", "2026-06-27", "21:00", -5, "Algeria", "Austria", "Kansas City", "Arrowhead Stadium"],
  ["J", "2026-06-27", "21:00", -5, "Jordan", "Argentina", "Arlington", "AT&T Stadium"],
  // Group K
  ["K", "2026-06-17", "12:00", -5, "Portugal", "DR Congo", "Houston", "NRG Stadium"],
  ["K", "2026-06-17", "20:00", -6, "Uzbekistan", "Colombia", "Mexico City", "Estadio Azteca"],
  ["K", "2026-06-23", "12:00", -5, "Portugal", "Uzbekistan", "Houston", "NRG Stadium"],
  ["K", "2026-06-23", "20:00", -6, "Colombia", "DR Congo", "Zapopan", "Estadio Akron"],
  ["K", "2026-06-27", "19:30", -4, "Colombia", "Portugal", "Miami Gardens", "Hard Rock Stadium"],
  ["K", "2026-06-27", "19:30", -4, "DR Congo", "Uzbekistan", "Atlanta", "Mercedes-Benz Stadium"],
  // Group L
  ["L", "2026-06-17", "15:00", -5, "England", "Croatia", "Arlington", "AT&T Stadium"],
  ["L", "2026-06-17", "19:00", -4, "Ghana", "Panama", "Toronto", "BMO Field"],
  ["L", "2026-06-23", "16:00", -4, "England", "Ghana", "Foxborough", "Gillette Stadium"],
  ["L", "2026-06-23", "19:00", -4, "Panama", "Croatia", "Toronto", "BMO Field"],
  ["L", "2026-06-27", "17:00", -4, "Panama", "England", "East Rutherford", "MetLife Stadium"],
  ["L", "2026-06-27", "17:00", -4, "Croatia", "Ghana", "Philadelphia", "Lincoln Financial Field"],
];

function toUtc(date, localTime, offsetHours) {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = localTime.split(":").map(Number);
  // Local wall time interpreted at the venue offset → real UTC instant.
  // UTC = local - offset; offset is negative, so we subtract a negative = add.
  const ms = Date.UTC(y, mo - 1, d, hh, mm) - offsetHours * 3600 * 1000;
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

const matches = SOURCE.map(([group, date, time, off, home, away, city, venue]) => ({
  group,
  date,
  kickoff_utc: toUtc(date, time, off),
  home,
  away,
  city,
  venue,
}));

const out = { groups: GROUPS, matches };
const file = path.join(__dirname, "fixtures.json");
fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");

// Also emit a TS copy for the server-side import API (opponent/round logic).
const tsFile = path.join(__dirname, "../../src/lib/wc26-fixtures.ts");
fs.writeFileSync(
  tsFile,
  "// AUTO-GENERATED by tools/wc26-captain-planner/build-fixtures.js — do not edit.\n" +
    "export const WC26_FIXTURES = " +
    JSON.stringify(out) +
    ";\n"
);
console.log(
  `Wrote ${file} and ${tsFile}: ${Object.keys(GROUPS).length} groups, ${matches.length} matches.`
);
