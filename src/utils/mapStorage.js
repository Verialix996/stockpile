import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_KEY = 'stockpile_maps_v1';

// Map data structure:
// {
//   global: { cols, rows, cells: { "x,y": { type, color, roomId?, cabinetId?, label? } } },
//   [roomId]: { cols, rows, cells: { ... } }
// }

export async function loadMaps() {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    } else {
      const raw = await AsyncStorage.getItem(MAP_KEY);
      return raw ? JSON.parse(raw) : {};
    }
  } catch { return {}; }
}

export async function saveMaps(maps) {
  try {
    const str = JSON.stringify(maps);
    if (Platform.OS === 'web') {
      localStorage.setItem(MAP_KEY, str);
    } else {
      await AsyncStorage.setItem(MAP_KEY, str);
    }
  } catch {}
}

export function emptyMap(cols = 20, rows = 20) {
  return { cols, rows, cells: {} };
}

export const CELL_TYPES = {
  empty:   { label: 'Erase',    emoji: '⬜', color: 'transparent', bg: 'transparent' },
  wall:    { label: 'Wall',     emoji: '🧱', color: '#4a4a5a',     bg: '#4a4a5a' },
  door:    { label: 'Door',     emoji: '🚪', color: '#8B5E3C',     bg: '#8B5E3C' },
  window:  { label: 'Window',   emoji: '🪟', color: '#4fc3f7',     bg: 'rgba(79,195,247,0.35)' },
  room:    { label: 'Room',     emoji: '🎨', color: null,           bg: null },  // uses custom color
  cabinet: { label: 'Cabinet',  emoji: '🗄️', color: '#7c6af5',     bg: '#7c6af5' },
};

export const ROOM_COLORS = [
  '#2d4a3e', '#2d3a4a', '#4a2d3e', '#3e4a2d',
  '#4a3a2d', '#2d4a4a', '#3a2d4a', '#4a4a2d',
];
