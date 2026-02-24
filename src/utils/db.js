import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stockpile_v1';

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

export const uid = () => Math.random().toString(36).slice(2, 9);

export async function loadDB() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { ...SEED };
  } catch {
    return { ...SEED };
  }
}

export async function saveDB(db) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}
