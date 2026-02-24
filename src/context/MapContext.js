import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { loadMaps, saveMaps, emptyMap } from '../utils/mapStorage';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [maps, setMaps]   = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMaps().then(m => { setMaps(m || {}); setLoaded(true); });
  }, []);

  const update = (next) => { setMaps(next); saveMaps(next); };

  const getMap = (mapId) => maps[mapId] || null;

  const initMap = (mapId, cols = 20, rows = 20) => {
    // Always initialise synchronously into current maps snapshot
    setMaps(prev => {
      if (prev[mapId]) return prev;
      const next = { ...prev, [mapId]: emptyMap(cols, rows) };
      saveMaps(next);
      return next;
    });
  };

  const resizeMap = (mapId, cols, rows) => {
    setMaps(prev => {
      const next = { ...prev, [mapId]: emptyMap(cols, rows) };
      saveMaps(next);
      return next;
    });
  };

  const setCells = (mapId, cellUpdates) => {
    setMaps(prev => {
      const map   = prev[mapId] || emptyMap();
      const cells = { ...map.cells };
      cellUpdates.forEach(({ x, y, cellData }) => {
        const key = `${x},${y}`;
        if (!cellData || cellData.type === 'empty') delete cells[key];
        else cells[key] = cellData;
      });
      const next = { ...prev, [mapId]: { ...map, cells } };
      saveMaps(next);
      return next;
    });
  };

  const clearMap = (mapId) => {
    setMaps(prev => {
      const map  = prev[mapId];
      if (!map) return prev;
      const next = { ...prev, [mapId]: { ...map, cells: {} } };
      saveMaps(next);
      return next;
    });
  };

  const deleteMap = (mapId) => {
    setMaps(prev => {
      const next = { ...prev };
      delete next[mapId];
      saveMaps(next);
      return next;
    });
  };

  // ── Merge all room maps into a global overview ─────────────────────────────
  // Rooms are laid out in a row, separated by a 2-cell gap, with a label row.
  const buildGlobalMap = (roomIds) => {
    const roomMaps = roomIds.map(id => maps[id]).filter(Boolean);
    if (roomMaps.length === 0) return emptyMap(20, 20);

    const GAP     = 2;
    const maxRows = Math.max(...roomMaps.map(m => m.rows));
    const totalCols = roomMaps.reduce((sum, m) => sum + m.cols + GAP, 0) - GAP;
    const mergedCells = {};

    let offsetX = 0;
    roomMaps.forEach((rm, i) => {
      Object.entries(rm.cells).forEach(([key, cell]) => {
        const [cx, cy] = key.split(',').map(Number);
        mergedCells[`${cx + offsetX},${cy}`] = cell;
      });
      offsetX += rm.cols + GAP;
    });

    return { cols: totalCols, rows: maxRows, cells: mergedCells, isGlobal: true };
  };

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0f14' }}>
        <ActivityIndicator color="#7c6af5" size="large" />
      </View>
    );
  }

  return (
    <MapContext.Provider value={{ maps, getMap, initMap, resizeMap, setCells, clearMap, deleteMap, buildGlobalMap }}>
      {children}
    </MapContext.Provider>
  );
}

export const useMap = () => useContext(MapContext);
