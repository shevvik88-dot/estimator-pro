import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { createClient } = await import('@supabase/supabase-js');

// ── Env ────────────────────────────────────────────────────────────────────
const envRaw = readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// ── Excel ──────────────────────────────────────────────────────────────────
const wb = XLSX.readFile('Template ADU.xlsx');
const ws = wb.Sheets['Template 6.0 (FHR and other PCA'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

// ── Helpers ────────────────────────────────────────────────────────────────
const UNITS = new Set(['EA', 'SF', 'LF', 'Floor SF', 'Roof SF', 'W&C SF', 'Wall SF']);

// Top-level categories that contain named sub-sections
const CONTAINERS = new Set(['KITCHEN', 'BATHROOM 1', 'BATHROOM 2', 'LAUNDRY', 'CLOSET / PANTRY']);

// Which sub-headers are valid inside each container (everything else exits container mode)
const CONTAINER_SUB_HEADERS = {
  'KITCHEN':       new Set(['CABINETS', 'BACKSPLASH', 'COUNTERTOPS', 'SHELVES', 'APPLIANCES']),
  'BATHROOM 1':    new Set(['VANITY', 'SHOWER/TUB ENCLOSURE', 'ACCESSORIES']),
  'BATHROOM 2':    new Set(['VANITY', 'SHOWER/TUB ENCLOSURE', 'ACCESSORIES']),
  'LAUNDRY':       new Set(['CABINETS', 'SHELVES']),
  'CLOSET / PANTRY': new Set(['CABINETS', 'SHELVES']),
};

const SKIP_ROWS = new Set([
  '.',
  'PLEASE CHECK THAT THE TOTAL FORMULA INCLUDE ALL NEW ITEMS WHICH YOU ADDED (IN CASE)',
  'Template',
]);

function cleanCategory(text) {
  return text
    .trim()
    .replace(/\s+LABOR\s*&\s*ROUGH\s*MATERIAL\s*/gi, '')
    .replace(/\s+LABOR\s*&\s*MATERIAL\s*/gi, '')
    .replace(/\s+LABOR\s*$/gi, '')
    .replace(/\s+MATERIAL\s*$/gi, '')
    .trim();
}

function isHeader(row) {
  const name = row[0];
  if (!name || typeof name !== 'string') return false;
  const t = name.trim();
  if (SKIP_ROWS.has(t)) return false;
  // Has a unit or numeric price → it's a line item
  if (typeof row[1] === 'number') return false;
  if (row[1] === 'N/A') return false;
  if (row[2] !== null && UNITS.has(String(row[2]))) return false;
  // All uppercase with at least 4 chars → header
  return t === t.toUpperCase() && t.replace(/[^A-Z]/g, '').length >= 3;
}

function isLineItem(row) {
  if (!row[0] || typeof row[0] !== 'string') return false;
  const t = row[0].trim();
  if (SKIP_ROWS.has(t)) return false;
  if (isHeader(row)) return false;
  return (
    typeof row[1] === 'number' ||
    row[1] === 'N/A' ||
    (row[2] !== null && UNITS.has(String(row[2])))
  );
}

function rateType(name) {
  if (/labor\s*&\s*(rough\s*)?material/i.test(name)) return 'base';
  if (/labor\s+and\s+material/i.test(name)) return 'base';
  if (/\|\s*labor\b/i.test(name)) return 'labor';
  if (/\|\s*material\b/i.test(name)) return 'material';
  if (/labor\b/i.test(name) && !/material/i.test(name)) return 'labor';
  if (/material\b/i.test(name) && !/labor/i.test(name)) return 'material';
  return 'base';
}

function parseMin(notes) {
  if (!notes || typeof notes !== 'string') return null;
  const line = notes.split(/\r?\n/)[0];
  // "min 1.5k", "min $1.5k"
  let m = line.match(/min\s*[-–]?\s*\$?\s*([\d.]+)\s*k/i);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  // "$1.5k min"
  m = line.match(/\$\s*([\d.]+)\s*k\s*min/i);
  if (m) return Math.round(parseFloat(m[1]) * 1000);
  // "min - $1200", "min $1200"
  m = line.match(/min\s*[-–]?\s*\$\s*([\d,]+)/i);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  // "$660min", "$400 min"
  m = line.match(/\$\s*([\d,]+)\s*min/i);
  if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  return null;
}

// ── Parse rows ─────────────────────────────────────────────────────────────
const items = [];
let category = null;
let subcategory = null;
let inContainer = false;
let lastItem = null;
let order = 0;

for (const row of rows) {
  const name = row[0];
  if (!name || typeof name !== 'string') continue;
  const t = name.trim();
  if (!t || SKIP_ROWS.has(t)) continue;

  if (isHeader(row)) {
    const clean = cleanCategory(t);

    if (CONTAINERS.has(clean)) {
      // Top-level container (KITCHEN, BATHROOM 1, CLOSET/PANTRY, etc.)
      category = clean;
      subcategory = null;
      inContainer = true;
    } else if (inContainer && CONTAINER_SUB_HEADERS[category]?.has(clean)) {
      // Known sub-section header within the current container
      subcategory = clean;
    } else {
      // Top-level category — exits any container context
      category = clean;
      subcategory = null;
      inContainer = false;
    }
    lastItem = null;
    continue;
  }

  if (isLineItem(row)) {
    const price = typeof row[1] === 'number' ? row[1] : null;
    const unit = row[2] ? String(row[2]) : null;
    const notes = typeof row[5] === 'string' ? row[5].trim() : null;
    const rt = rateType(t);

    const item = {
      category: category || 'GENERAL',
      subcategory: subcategory || null,
      name: t,
      description: null,
      unit,
      labor_rate:    rt === 'labor'    ? price : null,
      material_rate: rt === 'material' ? price : null,
      base_rate:     rt === 'base'     ? price : null,
      min_amount: parseMin(notes),
      notes: notes || null,
      work_types: null,
      sort_order: order++,
    };
    items.push(item);
    lastItem = item;
    continue;
  }

  // Description row — attach to last line item
  if (lastItem && t && t !== ' ') {
    // Append if there's already a description (some items span multiple desc rows)
    if (lastItem.description) {
      lastItem.description += ' ' + t;
    } else {
      lastItem.description = t;
    }
  }
}

console.log(`Parsed ${items.length} line items across ${new Set(items.map(i => i.category)).size} categories.`);

// ── Insert ─────────────────────────────────────────────────────────────────
const BATCH = 50;
let inserted = 0;
let failed = 0;

for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const { error } = await supabase.from('template_items').insert(batch);
  if (error) {
    console.error(`  ✗ Batch ${i}–${i + batch.length - 1}: ${error.message}`);
    failed += batch.length;
  } else {
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${items.length} items...`);
  }
}

console.log(`\nDone. ${inserted} inserted, ${failed} failed.`);

// ── Category summary ───────────────────────────────────────────────────────
const cats = {};
for (const item of items) {
  const key = item.subcategory ? `${item.category} > ${item.subcategory}` : item.category;
  cats[key] = (cats[key] || 0) + 1;
}
console.log('\nCategory breakdown:');
for (const [k, v] of Object.entries(cats)) {
  console.log(`  ${k}: ${v} items`);
}
