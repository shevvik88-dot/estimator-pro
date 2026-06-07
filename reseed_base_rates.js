import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { createClient } = await import('@supabase/supabase-js');

// ── Credentials ────────────────────────────────────────────────────────────
const envRaw = readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// ── Excel (equivalent to openpyxl data_only=True — reads cached values) ───
const wb = XLSX.readFile('Template ADU.xlsx');
const sheetName = 'Template 6.0 (FHR and other PCA';
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error(`Sheet "${sheetName}" not found. Available:`, wb.SheetNames);
  process.exit(1);
}
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

// ── Extract name → rate pairs ──────────────────────────────────────────────
const candidates = [];
for (const row of rows) {
  const name = row[0];
  const rate = row[1];
  if (!name || typeof name !== 'string') continue;
  const t = name.trim();
  if (!t) continue;
  if (typeof rate !== 'number') continue;
  candidates.push({ name: t, rate });
}

console.log(`Found ${candidates.length} rows with a name and numeric rate in the sheet.`);

// ── UPDATE base_rate WHERE name matches AND base_rate IS NULL ──────────────
let updated = 0;
let skipped = 0;
let failed = 0;

for (const { name, rate } of candidates) {
  const { data, error } = await supabase
    .from('template_items')
    .update({ base_rate: rate })
    .eq('name', name)
    .is('base_rate', null)
    .select('id');

  if (error) {
    console.error(`  ✗ "${name}": ${error.message}`);
    failed++;
  } else if (data.length === 0) {
    skipped++;
  } else {
    console.log(`  ✓ Updated "${name}" → base_rate = ${rate} (${data.length} row(s))`);
    updated += data.length;
  }
}

console.log(`\nDone. ${updated} rows updated, ${skipped} skipped (already had base_rate or no match), ${failed} errors.`);
