// server.js — data server with SQLite storage
// Usage: node server.js   (started automatically by npm run dev)

const http    = require('http');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const Database = require('better-sqlite3');

const PORT         = 3747;
const DB_FILE      = path.join(__dirname, 'data', 'stockpile.db');
const LEGACY_JSON  = path.join(__dirname, 'data', 'stockpile-data.json');
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llava';
const MAX_JSON_BODY_BYTES = Number(process.env.MAX_JSON_BODY_BYTES || 8 * 1024 * 1024);

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getOllamaUrl() {
  try {
    const url = new URL(OLLAMA_URL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
    return url;
  } catch (e) {
    throw new Error(`Invalid OLLAMA_URL (${OLLAMA_URL}): ${e.message}`);
  }
}

function readJsonBody(req, res, onJson) {
  let body = '';
  let received = 0;
  let rejected = false;

  req.setTimeout(30000, () => {
    if (!res.headersSent) sendJson(res, 408, { error: { message: 'Request body timed out' } });
    req.destroy();
  });

  req.on('data', chunk => {
    if (rejected) return;
    received += chunk.length;
    if (received > MAX_JSON_BODY_BYTES) {
      rejected = true;
      sendJson(res, 413, { error: { message: `Request body too large. Limit is ${MAX_JSON_BODY_BYTES} bytes.` } });
      req.resume();
      return;
    }
    body += chunk;
  });

  req.on('end', () => {
    if (rejected) return;
    try {
      onJson(JSON.parse(body || '{}'));
    } catch (_) {
      sendJson(res, 400, { error: { message: 'Invalid JSON request body' } });
    }
  });
}

function ollamaModelMatches(name) {
  return name === OLLAMA_MODEL || name === `${OLLAMA_MODEL}:latest` || name.startsWith(`${OLLAMA_MODEL}:`);
}

// Ensure the persistent data directory exists before SQLite opens the DB.
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

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
      sendJson(res, 200, loadData());
    } catch (e) {
      res.writeHead(500); res.end('Read error: ' + e.message);
    }
    return;
  }

  // POST /data
  if (req.method === 'POST' && req.url === '/data') {
    readJsonBody(req, res, (data) => {
      try {
        saveData(data);
        console.log(`💾 Saved — ${data.rooms?.length ?? 0} rooms, ${data.items?.length ?? 0} items`);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 400, { error: { message: 'Invalid data: ' + e.message } });
      }
    });
    return;
  }

  // GET /ai/status — check if Ollama is reachable and the configured model exists
  if (req.method === 'GET' && req.url === '/ai/status') {
    let ollamaUrl;
    try {
      ollamaUrl = getOllamaUrl();
    } catch (e) {
      sendJson(res, 500, { ok: false, error: e.message, model: OLLAMA_MODEL, url: OLLAMA_URL });
      return;
    }

    const transport = ollamaUrl.protocol === 'https:' ? https : http;
    const checkReq  = transport.request(
      { hostname: ollamaUrl.hostname, port: ollamaUrl.port || (ollamaUrl.protocol === 'https:' ? 443 : 11434), path: '/api/tags', method: 'GET' },
      (checkRes) => {
        let data = '';
        checkRes.on('data', chunk => { data += chunk; });
        checkRes.on('end', () => {
          if (checkRes.statusCode < 200 || checkRes.statusCode >= 300) {
            sendJson(res, 503, { ok: false, error: `Ollama status ${checkRes.statusCode}`, model: OLLAMA_MODEL, url: OLLAMA_URL });
            return;
          }

          try {
            const tags = JSON.parse(data || '{}');
            const models = Array.isArray(tags.models) ? tags.models : [];
            const names = models.map(m => m.name || m.model || '').filter(Boolean);
            const modelAvailable = names.some(ollamaModelMatches);
            sendJson(res, modelAvailable ? 200 : 503, {
              ok: modelAvailable,
              model: OLLAMA_MODEL,
              url: OLLAMA_URL,
              availableModels: names,
              error: modelAvailable ? undefined : `Model ${OLLAMA_MODEL} is not pulled in Ollama`,
            });
          } catch (_) {
            sendJson(res, 503, { ok: false, error: 'Could not parse Ollama /api/tags response', model: OLLAMA_MODEL, url: OLLAMA_URL });
          }
        });
      },
    );
    checkReq.setTimeout(5000, () => checkReq.destroy(new Error('Ollama status check timed out')));
    checkReq.on('error', (e) => {
      sendJson(res, 503, { ok: false, error: e.message, model: OLLAMA_MODEL, url: OLLAMA_URL });
    });
    checkReq.end();
    return;
  }

  // POST /ai — proxy to Ollama OpenAI-compatible endpoint
  if (req.method === 'POST' && req.url === '/ai') {
    readJsonBody(req, res, ({ messages }) => {
      if (!Array.isArray(messages)) {
        sendJson(res, 400, { error: { message: 'messages must be an array' } });
        return;
      }

      let ollamaUrl;
      try {
        ollamaUrl = getOllamaUrl();
      } catch (e) {
        sendJson(res, 500, { error: { message: e.message } });
        return;
      }

      const transport  = ollamaUrl.protocol === 'https:' ? https : http;
      const postData   = JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false });
      const options    = {
        hostname: ollamaUrl.hostname,
        port:     ollamaUrl.port || (ollamaUrl.protocol === 'https:' ? 443 : 11434),
        path:     '/v1/chat/completions',
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const proxyReq = transport.request(options, (proxyRes) => {
        let data = '';
        let received = 0;
        let tooLarge = false;
        proxyRes.on('data', chunk => {
          if (tooLarge) return;
          received += chunk.length;
          if (received > MAX_JSON_BODY_BYTES) {
            tooLarge = true;
            sendJson(res, 502, { error: { message: 'Ollama response was too large' } });
            proxyReq.destroy();
            return;
          }
          data += chunk;
        });
        proxyRes.on('end', () => {
          if (tooLarge) return;
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxyReq.setTimeout(120000, () => proxyReq.destroy(new Error('Ollama request timed out')));
      proxyReq.on('error', (e) => {
        if (!res.headersSent) sendJson(res, 502, { error: { message: 'Ollama unreachable: ' + e.message } });
      });

      proxyReq.write(postData);
      proxyReq.end();
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
  console.log(`🤖 AI proxy (Ollama): http://${localIp}:${PORT}/ai  →  ${OLLAMA_URL}  model: ${OLLAMA_MODEL}`);
  console.log(`\nKeep this terminal open while using the app.\n`);
});
