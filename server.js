// server.js — data server with SQLite storage
// Usage: node server.js   (started automatically by npm run dev)

const http    = require('http');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const Database = require('better-sqlite3');

const PORT    = 3747;
const DB_FILE = path.join(__dirname, 'data', 'stockpile.db');
const LEGACY_JSON = path.join(__dirname, 'data', 'stockpile-data.json');

// ── Open / create database ────────────────────────────────────────────────────
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');   // safe concurrent reads
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cabinets (
    id      TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shelves (
    id             TEXT PRIMARY KEY,
    cabinet_id     TEXT NOT NULL,
    name           TEXT NOT NULL,
    container_type TEXT DEFAULT NULL
  );
  CREATE TABLE IF NOT EXISTS items (
    id           TEXT PRIMARY KEY,
    shelf_id     TEXT NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT    DEFAULT 'Other',
    quantity     INTEGER DEFAULT 0,
    condition    TEXT    DEFAULT 'Good',
    expiry       TEXT    DEFAULT '',
    photo        TEXT    DEFAULT NULL,
    notes        TEXT    DEFAULT '',
    min_stock    INTEGER DEFAULT NULL,
    needs_restock INTEGER DEFAULT 0
  );
`);

// ── Column migrations (safe to run on existing databases) ─────────────────────
try { db.exec("ALTER TABLE shelves ADD COLUMN container_type TEXT DEFAULT NULL"); } catch (_) {}
try { db.exec("ALTER TABLE items ADD COLUMN needs_restock INTEGER DEFAULT 0"); } catch (_) {}

// ── Read all data as the JSON structure the app expects ───────────────────────
function loadData() {
  return {
    rooms:    db.prepare('SELECT id, name FROM rooms').all(),
    cabinets: db.prepare('SELECT id, room_id AS roomId, name FROM cabinets').all(),
    shelves:  db.prepare('SELECT id, cabinet_id AS cabinetId, name, container_type AS containerType FROM shelves').all(),
    items:    db.prepare(`
      SELECT id, shelf_id AS shelfId, name, category, quantity, condition,
             expiry, photo, notes, min_stock AS minStock, needs_restock AS needsRestock
      FROM items
    `).all().map(i => ({
      ...i,
      minStock:     i.minStock     ?? undefined,
      needsRestock: i.needsRestock === 1 ? true : false,
    })),
  };
}

// ── Write full data snapshot into SQLite (inside a transaction) ───────────────
const upsertRoom    = db.prepare('INSERT OR REPLACE INTO rooms    (id, name) VALUES (?, ?)');
const upsertCabinet = db.prepare('INSERT OR REPLACE INTO cabinets (id, room_id, name) VALUES (?, ?, ?)');
const upsertShelf   = db.prepare('INSERT OR REPLACE INTO shelves  (id, cabinet_id, name, container_type) VALUES (?, ?, ?, ?)');
const upsertItem    = db.prepare(`
  INSERT OR REPLACE INTO items
    (id, shelf_id, name, category, quantity, condition, expiry, photo, notes, min_stock, needs_restock)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const deleteRooms    = db.prepare('DELETE FROM rooms    WHERE id NOT IN (SELECT value FROM json_each(?))');
const deleteCabinets = db.prepare('DELETE FROM cabinets WHERE id NOT IN (SELECT value FROM json_each(?))');
const deleteShelves  = db.prepare('DELETE FROM shelves  WHERE id NOT IN (SELECT value FROM json_each(?))');
const deleteItems    = db.prepare('DELETE FROM items    WHERE id NOT IN (SELECT value FROM json_each(?))');

const saveTransaction = db.transaction((data) => {
  const { rooms = [], cabinets = [], shelves = [], items = [] } = data;

  for (const r of rooms)    upsertRoom.run(r.id, r.name);
  for (const c of cabinets) upsertCabinet.run(c.id, c.roomId, c.name);
  for (const s of shelves)  upsertShelf.run(s.id, s.cabinetId, s.name, s.containerType ?? null);
  for (const i of items)    upsertItem.run(
    i.id, i.shelfId, i.name,
    i.category    ?? 'Other',
    i.quantity    ?? 0,
    i.condition   ?? 'Good',
    i.expiry      ?? '',
    i.photo       ?? null,
    i.notes       ?? '',
    i.minStock    ?? null,
    i.needsRestock ? 1 : 0,
  );

  // Remove rows that no longer exist in the app state
  deleteRooms.run(JSON.stringify(rooms.map(r => r.id)));
  deleteCabinets.run(JSON.stringify(cabinets.map(c => c.id)));
  deleteShelves.run(JSON.stringify(shelves.map(s => s.id)));
  deleteItems.run(JSON.stringify(items.map(i => i.id)));
});

function saveData(data) {
  saveTransaction(data);
}

// ── Migrate from legacy JSON if DB is empty ───────────────────────────────────
const isEmpty = db.prepare('SELECT COUNT(*) as n FROM rooms').get().n === 0;
if (isEmpty && fs.existsSync(LEGACY_JSON)) {
  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf8'));
    saveData(legacy);
    console.log('✅ Migrated data from stockpile-data.json to SQLite');
  } catch (e) {
    console.warn('⚠️  Could not migrate legacy JSON:', e.message);
  }
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /data
  if (req.method === 'GET' && req.url === '/data') {
    try {
      const data = loadData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500); res.end('Read error: ' + e.message);
    }
    return;
  }

  // POST /data
  if (req.method === 'POST' && req.url === '/data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveData(data);
        console.log(`💾 Saved — ${data.rooms?.length ?? 0} rooms, ${data.items?.length ?? 0} items`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400); res.end('Invalid data: ' + e.message);
      }
    });
    return;
  }

  // POST /claude — proxy to Anthropic API
  if (req.method === 'POST' && req.url === '/claude') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { apiKey, payload } = JSON.parse(body);
        if (!apiKey) { res.writeHead(400); res.end('Missing apiKey'); return; }

        const postData = JSON.stringify(payload);
        const options = {
          hostname: 'api.anthropic.com',
          path:     '/v1/messages',
          method:   'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Length':    Buffer.byteLength(postData),
          },
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let data = '';
          proxyRes.on('data', chunk => { data += chunk; });
          proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
          });
        });

        proxyReq.on('error', (e) => {
          res.writeHead(500); res.end(JSON.stringify({ error: { message: e.message } }));
        });

        proxyReq.write(postData);
        proxyReq.end();
      } catch {
        res.writeHead(400); res.end('Invalid request');
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const nets    = os.networkInterfaces();
  const localIp = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost';

  console.log(`\n✅ Stockpile server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${localIp}:${PORT}  ← use this on phones`);
  console.log(`📦 Database: ${DB_FILE}`);
  console.log(`🤖 Claude proxy: http://${localIp}:${PORT}/claude`);
  console.log(`\nKeep this terminal open while using the app.\n`);
});
