import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// ── CSV column definition ─────────────────────────────────────────────────────
export const CSV_HEADERS = [
  'Room', 'Cabinet', 'Shelf',
  'Name', 'Quantity', 'Condition', 'Category',
  'Expiry', 'MinStock', 'Notes',
];

// ── Escape a single cell value ────────────────────────────────────────────────
function esc(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Parse a single CSV line (handles quoted fields) ───────────────────────────
export function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ── Build CSV string from db snapshot ────────────────────────────────────────
export function buildCSV(db) {
  const lines = [CSV_HEADERS.join(',')];

  db.items.forEach(item => {
    const shelf   = db.shelves.find(s => s.id === item.shelfId);
    const cabinet = shelf   ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
    const room    = cabinet ? db.rooms.find(r => r.id === cabinet.roomId)     : null;

    lines.push([
      esc(room?.name     || ''),
      esc(cabinet?.name  || ''),
      esc(shelf?.name    || ''),
      esc(item.name      || ''),
      esc(item.quantity  ?? 0),
      esc(item.condition || 'Good'),
      esc(item.category  || 'Other'),
      esc(item.expiry    || ''),
      esc(item.minStock  != null ? item.minStock : ''),
      esc(item.notes     || ''),
    ].join(','));
  });

  return lines.join('\n');
}

// ── Export CSV (web: download, mobile: share sheet) ───────────────────────────
export async function downloadCSV(csvString) {
  const filename = `stockpile-${new Date().toISOString().slice(0,10)}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  // Mobile: write to temp file then open share sheet
  const fileUri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: 'utf8' });
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Stockpile Data' });
  return true;
}

// ── Parse CSV text → array of row objects ────────────────────────────────────
export function parseCSV(text) {
  const errors = [];
  const lines  = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                     .split('\n').filter(l => l.trim());

  if (lines.length < 2) return { rows: [], errors: ['File is empty or has no data rows.'] };

  const header   = splitCSVLine(lines[0]).map(h => h.trim());
  const required = ['Room', 'Cabinet', 'Shelf', 'Name'];
  for (const col of required) {
    if (!header.includes(col)) errors.push(`Missing required column: "${col}"`);
  }
  if (errors.length) return { rows: [], errors };

  const idx = col => header.indexOf(col);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    const get   = col => (cells[idx(col)] || '').trim();

    const name = get('Name');
    if (!name) { errors.push(`Row ${i + 1}: missing Name — skipped`); continue; }

    const room = get('Room'), cabinet = get('Cabinet'), shelf = get('Shelf');
    if (!room || !cabinet || !shelf) {
      errors.push(`Row ${i + 1} ("${name}"): missing Room/Cabinet/Shelf — skipped`);
      continue;
    }

    const qty      = parseInt(get('Quantity'));
    const minRaw   = get('MinStock');
    const minStock = minRaw !== '' ? parseInt(minRaw) : null;

    rows.push({
      room, cabinet, shelf, name,
      quantity:  isNaN(qty)      ? 0    : qty,
      condition: get('Condition') || 'Good',
      category:  get('Category')  || 'Other',
      expiry:    get('Expiry')    || '',
      minStock:  minStock != null && !isNaN(minStock) ? minStock : null,
      notes:     get('Notes')     || '',
    });
  }

  return { rows, errors };
}

// ── Rebuild db from parsed rows ───────────────────────────────────────────────
export function rowsToDB(rows, existingDB, mode = 'replace') {
  const uid = () => Math.random().toString(36).slice(2, 10);

  const rooms    = mode === 'merge' ? [...existingDB.rooms]    : [];
  const cabinets = mode === 'merge' ? [...existingDB.cabinets] : [];
  const shelves  = mode === 'merge' ? [...existingDB.shelves]  : [];
  const items    = mode === 'merge' ? [...existingDB.items]    : [];

  const findOrAdd = (arr, match, make) => {
    let found = arr.find(match);
    if (!found) { found = make(); arr.push(found); }
    return found;
  };

  rows.forEach(row => {
    const room = findOrAdd(rooms,
      r => r.name === row.room,
      () => ({ id: uid(), name: row.room }));

    const cabinet = findOrAdd(cabinets,
      c => c.name === row.cabinet && c.roomId === room.id,
      () => ({ id: uid(), roomId: room.id, name: row.cabinet }));

    const shelf = findOrAdd(shelves,
      s => s.name === row.shelf && s.cabinetId === cabinet.id,
      () => ({ id: uid(), cabinetId: cabinet.id, name: row.shelf }));

    items.push({
      id: uid(), shelfId: shelf.id, photo: null,
      name:      row.name,
      quantity:  row.quantity,
      condition: row.condition,
      category:  row.category,
      expiry:    row.expiry,
      minStock:  row.minStock,
      notes:     row.notes,
    });
  });

  return { rooms, cabinets, shelves, items };
}
