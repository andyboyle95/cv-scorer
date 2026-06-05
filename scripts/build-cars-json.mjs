/**
 * build-cars-json.mjs
 *
 * Builds public/data/cars.json from official VCA Car Fuel Data CSVs.
 *
 * DATA SOURCES (Open Government Licence v3.0 — Vehicle Certification Agency)
 * ─────────────────────────────────────────────────────────────────────────────
 * Latest (Euro 6 realtime):
 *   https://carfueldata.vehicle-certification-agency.gov.uk/downloads/download.aspx?rg=latest
 *   → click the ZIP link → extract → rename to scripts/vca-source-latest.csv
 *
 * Annual guides (for historical/discontinued models):
 *   https://carfueldata.vehicle-certification-agency.gov.uk/downloads/download.aspx?rg=2025
 *   https://carfueldata.vehicle-certification-agency.gov.uk/downloads/download.aspx?rg=2024
 *   https://carfueldata.vehicle-certification-agency.gov.uk/downloads/download.aspx?rg=2023
 *   → download each year's data zip → extract CSV → rename to vca-source-YYYY.csv
 *
 * Run: node scripts/build-cars-json.mjs
 *
 * Latest source takes priority; older years fill in models no longer in the latest data.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = resolve(__dir, '../public/data/cars.json');

// Source files in priority order: latest first
const SOURCES = [
  { path: resolve(__dir, 'vca-source-latest.csv'), mpgCol: 21, mkwhCol: 10, whkmCol: 11, co2Col: 29, fuelCol: 6 },
  { path: resolve(__dir, 'vca-source-2025.csv'),   mpgCol: 20, mkwhCol:  9, whkmCol: 10, co2Col: 28, fuelCol: 5 },
  { path: resolve(__dir, 'vca-source-2024.csv'),   mpgCol: 20, mkwhCol: 12, whkmCol: 13, co2Col: 28, fuelCol: 5 },
  { path: resolve(__dir, 'vca-source-2023.csv'),   mpgCol: 20, mkwhCol: 12, whkmCol: 13, co2Col: 28, fuelCol: 5 },
];

const MAKE_FIX = new Map([
  ['Aston Martin Lagonda', 'Aston Martin'],
  ['Chrysler Jeep', 'Jeep'],
  ['Chery Uk Ltd', 'Chery'],
  ['Gwm', 'GWM'],
  ['Ineos Automotive Ltd', 'Ineos'],
  ['Kgm Uk Motors Ltd', 'KGM'],
  ['Mg Motors Uk', 'MG'],
  ['Mg Motor Uk', 'MG'],
  ['Mercedes-Benz', 'Mercedes'],
  ['Smart Uk Automotive Ltd', 'Smart'],
  ['Volkswagen', 'VW'],
  ['Bentley Motors', 'Bentley'],
  ['Rolls Royce', 'Rolls-Royce'],
  ['Mini', 'MINI'],
]);

function normaliseMake(s) {
  let t = s.trim().replace(/\s+/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  for (const [from, to] of [['Bmw','BMW'],['Mg ','MG '],['Vw ','VW '],['Ds ','DS '],
                              ['Byd','BYD'],['Gmc','GMC'],['Mini','MINI'],['Ldv','LDV']]) {
    t = t.includes(from) ? t.replaceAll(from, to) : t;
  }
  return MAKE_FIX.get(t) ?? t;
}

function normaliseFuel(raw) {
  const f = raw.trim().toLowerCase();
  if (f === 'electricity') return 'Electric';
  if (['petrol', 'petrol / lpg', 'petrol hybrid'].includes(f)) return 'Petrol';
  if (f === 'diesel') return 'Diesel';
  if (f.includes('petrol electric')) return 'Petrol';     // MHEV / full hybrid
  if (f.includes('diesel electric') || f.includes('electricity / diesel')) return 'Diesel';
  if (f.includes('electricity / petrol')) return 'Electric'; // PHEV
  return null;
}

function pf(s) {
  const v = parseFloat((s ?? '').trim());
  return isFinite(v) && v > 0 ? v : null;
}

const all = [];
const seen = new Set();

for (const { path, mpgCol, mkwhCol, whkmCol, co2Col, fuelCol } of SOURCES) {
  if (!existsSync(path)) {
    console.warn(`SKIP (not found): ${path}`);
    continue;
  }
  const lines = readFileSync(path, 'latin1').split('\n').filter(Boolean);
  let added = 0;

  for (let i = 1; i < lines.length; i++) {
    const r = lines[i].split(',');
    if (r.length <= Math.max(mpgCol, co2Col, fuelCol)) continue;

    const fuel = normaliseFuel(r[fuelCol] ?? '');
    if (!fuel) continue;

    const make  = normaliseMake(r[0] ?? '');
    const model = (r[1] ?? '').trim().replace(/\s+/g, ' ');
    if (!make || !model) continue;

    let variant = (r[2] ?? '').trim().replace(/\s+/g, ' ');
    if (variant.toLowerCase().startsWith(model.toLowerCase())) {
      variant = variant.slice(model.length).trim();
    }

    const key = `${make}|${model}|${variant}|${fuel}`;
    if (seen.has(key)) continue;

    let mpg = null, whpm = null;

    if (fuel === 'Petrol' || fuel === 'Diesel') {
      const v = pf(r[mpgCol]);
      if (v && v >= 5) mpg = Math.round(v * 10) / 10;
    }

    if (fuel === 'Electric' || !mpg) {
      const mkwh = pf(r[mkwhCol]);
      if (mkwh) {
        whpm = Math.round(1000 / mkwh);
      } else {
        const wkm = pf(r[whkmCol]);
        if (wkm) whpm = Math.round(wkm * 1.60934);
      }
    }

    if (fuel === 'Electric' && !whpm) continue;
    if ((fuel === 'Petrol' || fuel === 'Diesel') && !mpg) continue;

    const co2v = pf(r[co2Col]);
    const co2gkm = co2v != null ? Math.round(co2v) : (fuel === 'Electric' ? 0 : null);

    seen.add(key);
    all.push({ make, model, variant, fuel, mpg, whpm, co2gkm });
    added++;
  }

  console.log(`  ${String(added).padStart(5)} from ${path.split('/').pop()}`);
}

const fuelOrder = { Petrol: 0, Diesel: 1, Electric: 2 };
all.sort((a, b) => {
  const fo = (fuelOrder[a.fuel] ?? 9) - (fuelOrder[b.fuel] ?? 9);
  return fo || `${a.make} ${a.model} ${a.variant}`.localeCompare(`${b.make} ${b.model} ${b.variant}`);
});

writeFileSync(OUT, JSON.stringify(all, null, 2) + '\n', 'utf8');
console.log(`\n✓ ${all.length} cars → ${OUT}`);
console.log(`  Petrol: ${all.filter(c => c.fuel==='Petrol').length}`);
console.log(`  Diesel: ${all.filter(c => c.fuel==='Diesel').length}`);
console.log(`  Electric: ${all.filter(c => c.fuel==='Electric').length}`);
console.log(`  Makes: ${new Set(all.map(c => c.make)).size}`);
