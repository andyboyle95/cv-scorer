/**
 * update-commute-data.mjs
 *
 * Updates public/data/commute-data.json with the latest UK fuel prices.
 *
 * Fuel prices source: DESNZ Weekly Road Fuel Prices
 *   https://www.gov.uk/government/statistics/weekly-road-fuel-prices
 *   The page links to a CSV/ODS file; we fetch the known stable CSV endpoint
 *   and parse the most recent petrol/diesel pump prices (pence per litre).
 *
 * Electricity price: Ofgem price cap — updated manually each quarter or via
 *   the Ofgem API (https://api.ofgem.org.uk/). For now this script keeps the
 *   existing value unless a newer figure is hardcoded below.
 *
 * Usage:  node scripts/update-commute-data.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '../public/data/commute-data.json');

// ─── Ofgem Q2 2025 electricity price cap unit rate (p/kWh) → £/kWh ──────────
// Update this figure each quarter when Ofgem announces the new cap.
// Q2 2025: 24.50p/kWh
const OFGEM_ELECTRICITY_PENCE_PER_KWH = 24.50;

/**
 * Fetch the DESNZ weekly road fuel prices CSV.
 *
 * DESNZ publish a CSV at a URL like:
 *   https://assets.publishing.service.gov.uk/media/<id>/CSV_180425.csv
 * The path changes with each release. The stable discovery URL is:
 *   https://www.gov.uk/government/statistics/weekly-road-fuel-prices
 * We fetch that HTML page, find the most recent CSV/ODS attachment link,
 * then fetch and parse that file.
 *
 * The CSV has columns including:
 *   Date, Unleaded (ppl), Diesel (ppl), ...
 *
 * Returns { petrolPPL, dieselPPL } or null on failure.
 */
async function fetchDESNZPrices() {
  const PAGE_URL = 'https://www.gov.uk/government/statistics/weekly-road-fuel-prices';

  try {
    console.log(`Fetching DESNZ statistics page: ${PAGE_URL}`);
    const pageRes = await fetch(PAGE_URL, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; commute-data-updater/1.0)' },
    });

    if (!pageRes.ok) {
      console.warn(`Failed to fetch DESNZ page: HTTP ${pageRes.status}`);
      return null;
    }

    const html = await pageRes.text();

    // Find the first .csv link in the page
    const csvMatch = html.match(/href="(https:\/\/assets\.publishing\.service\.gov\.uk\/[^"]+\.csv)"/i);
    if (!csvMatch) {
      console.warn('Could not find a CSV link on the DESNZ page.');
      return null;
    }

    const csvUrl = csvMatch[1];
    console.log(`Found CSV: ${csvUrl}`);

    const csvRes = await fetch(csvUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; commute-data-updater/1.0)' },
    });

    if (!csvRes.ok) {
      console.warn(`Failed to fetch CSV: HTTP ${csvRes.status}`);
      return null;
    }

    const csv = await csvRes.text();
    const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean);

    // Find the header row to locate petrol and diesel columns
    let headerIdx = -1;
    let petrolCol = -1;
    let dieselCol = -1;

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cells = lines[i].split(',').map((c) => c.toLowerCase().replace(/"/g, '').trim());
      const petrolIdx = cells.findIndex(
        (c) => c.includes('unleaded') || c.includes('petrol') || c === 'pump price petrol'
      );
      const dieselIdx = cells.findIndex(
        (c) => c.includes('diesel') && !c.includes('gas')
      );
      if (petrolIdx !== -1 && dieselIdx !== -1) {
        headerIdx = i;
        petrolCol = petrolIdx;
        dieselCol = dieselIdx;
        console.log(`Header row ${i}: petrol col ${petrolCol}, diesel col ${dieselCol}`);
        break;
      }
    }

    if (headerIdx === -1 || petrolCol === -1 || dieselCol === -1) {
      console.warn('Could not parse CSV header for petrol/diesel columns.');
      return null;
    }

    // The last non-empty data row has the most recent prices
    let latestPetrolPPL = null;
    let latestDieselPPL = null;

    for (let i = lines.length - 1; i > headerIdx; i--) {
      const cells = lines[i].split(',').map((c) => c.replace(/"/g, '').trim());
      const petrolVal = parseFloat(cells[petrolCol]);
      const dieselVal = parseFloat(cells[dieselCol]);
      if (!isNaN(petrolVal) && !isNaN(dieselVal) && petrolVal > 0 && dieselVal > 0) {
        latestPetrolPPL = petrolVal;
        latestDieselPPL = dieselVal;
        console.log(`Latest prices from row ${i}: petrol ${petrolVal}ppl, diesel ${dieselVal}ppl`);
        break;
      }
    }

    if (latestPetrolPPL === null || latestDieselPPL === null) {
      console.warn('Could not extract price data from CSV rows.');
      return null;
    }

    return {
      petrolPPL: latestPetrolPPL,
      dieselPPL: latestDieselPPL,
    };
  } catch (err) {
    console.warn('Error fetching DESNZ prices:', err.message);
    return null;
  }
}

async function main() {
  // Read existing data
  let existing;
  try {
    existing = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    console.error('Could not read existing commute-data.json');
    process.exit(1);
  }

  console.log('Current prices:');
  console.log(`  Petrol: £${existing.petrolPricePerLitre}/litre`);
  console.log(`  Diesel: £${existing.dieselPricePerLitre}/litre`);
  console.log(`  Electricity: £${existing.electricityPricePerKwh}/kWh`);

  const desnz = await fetchDESNZPrices();

  const today = new Date().toISOString().slice(0, 10);
  const updated = { ...existing, lastUpdated: today };

  if (desnz) {
    // DESNZ prices are in pence per litre — convert to £
    const petrolPerLitre = Math.round((desnz.petrolPPL / 100) * 1000) / 1000;
    const dieselPerLitre = Math.round((desnz.dieselPPL / 100) * 1000) / 1000;

    console.log(`\nNew prices from DESNZ:`);
    console.log(`  Petrol: £${petrolPerLitre}/litre`);
    console.log(`  Diesel: £${dieselPerLitre}/litre`);

    updated.petrolPricePerLitre = petrolPerLitre;
    updated.dieselPricePerLitre = dieselPerLitre;
  } else {
    console.log('\nFalling back to existing petrol/diesel prices.');
  }

  // Update electricity price from hardcoded Ofgem figure
  const electricityPerKwh = Math.round((OFGEM_ELECTRICITY_PENCE_PER_KWH / 100) * 1000) / 1000;
  updated.electricityPricePerKwh = electricityPerKwh;
  console.log(`  Electricity: £${electricityPerKwh}/kWh (Ofgem cap)`);

  writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`\nUpdated ${DATA_FILE}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
