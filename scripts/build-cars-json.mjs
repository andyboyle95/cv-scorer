/**
 * build-cars-json.mjs
 *
 * Converts the official VCA Car Fuel Data CSV into public/data/cars.json.
 *
 * HOW TO GET THE SOURCE DATA
 * ──────────────────────────
 * 1. Go to https://carfueldata.vehicle-certification-agency.gov.uk/
 * 2. Click "All manufacturers" → leave all filters blank → click Search
 * 3. Click "Download as CSV" at the bottom of the results page
 * 4. Save the file as: scripts/vca-source.csv
 * 5. Run: node scripts/build-cars-json.mjs
 *
 * The VCA dataset contains ~6,000–8,000 entries covering every new car
 * approved for sale in the UK, including WLTP combined MPG and CO2 g/km.
 *
 * Data is published under the Open Government Licence v3.0.
 * Source: Vehicle Certification Agency, DVSA / OZEV
 *
 * COLUMN MAPPING (typical VCA CSV headers)
 * ─────────────────────────────────────────
 * Manufacturer / Description / Engine Size / Fuel Type /
 * Transmission / WLTP Combined (mpg) / WLTP CO2 (g/km) /
 * Electric Range (WLTP miles) / Wh/km
 *
 * Run annually after downloading the latest CSV from VCA.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_CSV = resolve(__dirname, 'vca-source.csv');
const OUTPUT_JSON = resolve(__dirname, '../public/data/cars.json');

if (!existsSync(SOURCE_CSV)) {
  console.error(`\nSource CSV not found: ${SOURCE_CSV}`);
  console.error(`\nTo download it:`);
  console.error(`  1. Visit https://carfueldata.vehicle-certification-agency.gov.uk/`);
  console.error(`  2. Search with no filters → Download as CSV`);
  console.error(`  3. Save to scripts/vca-source.csv`);
  console.error(`  4. Re-run: node scripts/build-cars-json.mjs\n`);
  process.exit(1);
}

const csv = readFileSync(SOURCE_CSV, 'utf8');
const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);

// Find header row
const headerLine = lines.findIndex(l =>
  l.toLowerCase().includes('manufacturer') || l.toLowerCase().includes('make')
);
if (headerLine === -1) {
  console.error('Could not find header row in CSV. Check the file format.');
  process.exit(1);
}

const headers = lines[headerLine]
  .split(',')
  .map(h => h.replace(/"/g, '').trim().toLowerCase());

console.log('Headers found:', headers.slice(0, 12).join(' | '));

// Column detection (VCA column names vary slightly between releases)
function col(keywords) {
  return headers.findIndex(h => keywords.some(k => h.includes(k)));
}

const makeCol    = col(['manufacturer', 'make']);
const modelCol   = col(['description', 'model', 'vehicle']);
const fuelCol    = col(['fuel type', 'fuel']);
const mpgCol     = col(['wltp combined', 'mpg', 'combined mpg', 'urban extra']);
const co2Col     = col(['co2', 'co₂']);
const whkmCol    = col(['wh/km', 'whkm', 'energy consumption']);

console.log(`Columns: make=${makeCol} model=${modelCol} fuel=${fuelCol} mpg=${mpgCol} co2=${co2Col} whkm=${whkmCol}`);

const LITRES_PER_GALLON = 4.54609;

function normaliseFuel(raw) {
  const f = raw.toLowerCase();
  if (f.includes('electric') && !f.includes('plug') && !f.includes('hybrid')) return 'Electric';
  if (f.includes('petrol') || f.includes('gasoline')) return 'Petrol';
  if (f.includes('diesel')) return 'Diesel';
  return null; // skip hybrids not explicitly petrol/diesel, hydrogen, etc.
}

const cars = [];
let skipped = 0;

for (let i = headerLine + 1; i < lines.length; i++) {
  const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
  if (cells.length < 4) continue;

  const rawMake  = cells[makeCol]  ?? '';
  const rawModel = cells[modelCol] ?? '';
  const rawFuel  = cells[fuelCol]  ?? '';

  if (!rawMake || !rawModel) { skipped++; continue; }

  const fuel = normaliseFuel(rawFuel);
  if (!fuel) { skipped++; continue; }

  // Parse MPG — VCA gives L/100km or mpg depending on version
  let mpg = null;
  let whpm = null;

  if (fuel === 'Electric') {
    // Energy consumption in Wh/km → convert to Wh/mile
    const whkm = whkmCol >= 0 ? parseFloat(cells[whkmCol]) : NaN;
    if (!isNaN(whkm) && whkm > 0) {
      whpm = Math.round(whkm * 1.60934);
    }
  } else {
    const mpgRaw = mpgCol >= 0 ? parseFloat(cells[mpgCol]) : NaN;
    if (!isNaN(mpgRaw) && mpgRaw > 0) {
      // If value looks like L/100km (< 15), convert to MPG
      if (mpgRaw < 15) {
        mpg = Math.round((LITRES_PER_GALLON / mpgRaw) * 100 * 10) / 10;
      } else {
        mpg = mpgRaw;
      }
    }
  }

  const co2Raw = co2Col >= 0 ? parseFloat(cells[co2Col]) : NaN;
  const co2gkm = (!isNaN(co2Raw) && co2Raw >= 0) ? Math.round(co2Raw) : (fuel === 'Electric' ? 0 : null);

  // Split model into model + variant (first word = model, rest = variant)
  const parts = rawModel.replace(/\s+/g, ' ').split(' ');
  const model   = parts.slice(0, 2).join(' ');
  const variant = parts.slice(2).join(' ') || '';

  // Normalise make capitalisation
  const make = rawMake
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .replace('Bmw', 'BMW')
    .replace('Mg ', 'MG ')
    .replace('Vw', 'VW')
    .replace('Mini', 'MINI');

  cars.push({ make, model, variant, fuel, mpg, whpm, co2gkm });
}

// Deduplicate on make+model+variant+fuel
const seen = new Set();
const deduped = cars.filter(c => {
  const key = `${c.make}|${c.model}|${c.variant}|${c.fuel}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Sort: petrol → diesel → electric, then alphabetically
deduped.sort((a, b) => {
  const fuelOrder = { Petrol: 0, Diesel: 1, Electric: 2 };
  const fo = (fuelOrder[a.fuel] ?? 3) - (fuelOrder[b.fuel] ?? 3);
  if (fo !== 0) return fo;
  return `${a.make} ${a.model} ${a.variant}`.localeCompare(`${b.make} ${b.model} ${b.variant}`);
});

writeFileSync(OUTPUT_JSON, JSON.stringify(deduped, null, 2) + '\n', 'utf8');

console.log(`\n✓ Written ${deduped.length} cars to ${OUTPUT_JSON}`);
console.log(`  Skipped: ${skipped} rows (hybrids without clear fuel type, blanks, etc.)`);
console.log(`  Petrol: ${deduped.filter(c=>c.fuel==='Petrol').length}`);
console.log(`  Diesel: ${deduped.filter(c=>c.fuel==='Diesel').length}`);
console.log(`  Electric: ${deduped.filter(c=>c.fuel==='Electric').length}`);
