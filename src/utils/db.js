import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY         = 'stockpile_v1';
const SERVER_URL  = 'http://localhost:3747';

export const SEED = {
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

export const uid = () => Math.random().toString(36).slice(2, 9);

// ── Web: read/write via local file server ─────────────────────────────────────
async function loadWeb() {
  try {
    const res = await fetch(`${SERVER_URL}/data`);
    if (!res.ok) throw new Error('Server error');
    return await res.json();
  } catch {
    console.warn('⚠️  Could not reach data server — falling back to localStorage');
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...SEED };
  }
}

async function saveWeb(db) {
  try {
    await fetch(`${SERVER_URL}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    });
  } catch {
    // Fallback: at least save to localStorage so nothing is lost
    localStorage.setItem(KEY, JSON.stringify(db));
  }
}

// ── Mobile: use AsyncStorage ──────────────────────────────────────────────────
async function loadMobile() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...SEED };
  } catch {
    return { ...SEED };
  }
}

async function saveMobile(db) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const loadDB = () => Platform.OS === 'web' ? loadWeb()        : loadMobile();
export const saveDB = (db) => Platform.OS === 'web' ? saveWeb(db)    : saveMobile(db);
