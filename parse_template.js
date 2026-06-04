import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('Template ADU.xlsx');
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  console.log(`\n=== ${name} ===`);
  data.forEach((row, i) => {
    if (row.some(c => c !== null)) {
      console.log(`Row ${i + 1}:`, JSON.stringify(row));
    }
  });
});
