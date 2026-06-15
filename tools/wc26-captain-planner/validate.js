// Validates fixtures.json structural integrity.
// Run: node validate.js   (exits non-zero on any problem)
const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures.json"), "utf8")
);
const errors = [];

const groupKeys = Object.keys(data.groups);
if (groupKeys.length !== 12) errors.push(`Expected 12 groups, got ${groupKeys.length}`);

const validTeams = new Set();
for (const [g, teams] of Object.entries(data.groups)) {
  if (teams.length !== 4) errors.push(`Group ${g} has ${teams.length} teams (expected 4)`);
  teams.forEach((t) => validTeams.add(t));
}

if (!Array.isArray(data.matches) || data.matches.length !== 72)
  errors.push(`Expected 72 matches, got ${data.matches?.length}`);

// Each team should play exactly 3 group matches.
const counts = {};
for (const m of data.matches) {
  // name consistency between matches and groups
  for (const t of [m.home, m.away]) {
    if (!validTeams.has(t)) errors.push(`Team "${t}" in matches is not in any group`);
    counts[t] = (counts[t] || 0) + 1;
  }
  // valid UTC timestamp
  const d = new Date(m.kickoff_utc);
  if (isNaN(d.getTime()) || !/Z$/.test(m.kickoff_utc))
    errors.push(`Invalid UTC kickoff "${m.kickoff_utc}" (${m.home} v ${m.away})`);
  // match group must exist and both teams belong to it
  const grp = data.groups[m.group];
  if (!grp) errors.push(`Match references unknown group ${m.group}`);
  else {
    if (!grp.includes(m.home)) errors.push(`${m.home} not in group ${m.group}`);
    if (!grp.includes(m.away)) errors.push(`${m.away} not in group ${m.group}`);
  }
}
for (const t of validTeams) {
  if (counts[t] !== 3) errors.push(`Team "${t}" plays ${counts[t] || 0} matches (expected 3)`);
}

if (errors.length) {
  console.error("✗ fixtures.json INVALID:\n - " + errors.join("\n - "));
  process.exit(1);
}
console.log("✓ fixtures.json valid: 12 groups × 4 teams, 72 matches, all UTC, names consistent.");
