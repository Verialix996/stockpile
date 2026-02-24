// server.js — run alongside "npm run web" to persist data to a local JSON file
// Usage: node server.js   (in a separate terminal)

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 3747;
const DATA_FILE = path.join(__dirname, 'stockpile-data.json');

const SEED = {
  rooms: [
    { id: 'r1', name: 'Kitchen' },
    { id: 'r2', name: 'Garage' },
  ],
  cabinets: [
    { id: 'c1', roomId: 'r1', name: 'Upper Cabinet' },
    { id: 'c2', roomId: 'r2', name: 'Tool Cabinet' },
  ],
  shelves: [
    { id: 's1', cabinetId: 'c1', name: 'Shelf 1' },
    { id: 's2', cabinetId: 'c1', name: 'Shelf 2' },
    { id: 's3', cabinetId: 'c2', name: 'Top Shelf' },
  ],
  items: [
    { id: 'i1', shelfId: 's1', name: 'Olive Oil',  category: 'Food',  quantity: 2, condition: 'Good', expiry: '2026-06-01', photo: null, notes: '' },
    { id: 'i2', shelfId: 's2', name: 'Pasta',      category: 'Food',  quantity: 5, condition: 'Good', expiry: '',           photo: null, notes: '' },
    { id: 'i3', shelfId: 's3', name: 'Drill Bits', category: 'Tools', quantity: 1, condition: 'Good', expiry: '',           photo: null, notes: '' },
  ],
};

// Initialise file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(SEED, null, 2));
  console.log('Created stockpile-data.json with seed data');
}

const server = http.createServer((req, res) => {
  // Allow requests from the Expo web dev server
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /data — return current data
  if (req.method === 'GET' && req.url === '/data') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch {
      res.writeHead(500);
      res.end('Read error');
    }
    return;
  }

  // POST /data — save new data
  if (req.method === 'POST' && req.url === '/data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        // Validate it's real JSON before saving
        JSON.parse(body);
        fs.writeFileSync(DATA_FILE, body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✅ Stockpile data server running at http://localhost:${PORT}`);
  console.log(`📁 Data file: ${DATA_FILE}`);
  console.log(`\nKeep this terminal open while using the app.\n`);
});
