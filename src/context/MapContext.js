import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadMaps, saveMaps, emptyMap } from '../utils/mapStorage';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [maps, setMaps] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMaps().then(m => { setMaps(m); setLoaded(true); });
  }, []);

  const update = (next) => { setMaps(next); saveMaps(next); };

  const getMap = (mapId) => maps[mapId] || null;

  const initMap = (mapId, cols, rows) => {
    if (!maps[mapId]) {
      update({ ...maps, [mapId]: emptyMap(cols, rows) });
    }
  };

  const resizeMap = (mapId, cols, rows) => {
    update({ ...maps, [mapId]: { ...emptyMap(cols, rows), cells: {} } });
  };

  const setCell = (mapId, x, y, cellData) => {
    const map = maps[mapId] || emptyMap();
    const key = `${x},${y}`;
    const cells = { ...map.cells };
    if (!cellData || cellData.type === 'empty') {
      delete cells[key];
    } else {
      cells[key] = cellData;
    }
    update({ ...maps, [mapId]: { ...map, cells } });
  };

  const setCells = (mapId, cellUpdates) => {
    // Batch update multiple cells at once
    const map = maps[mapId] || emptyMap();
    const cells = { ...map.cells };
    cellUpdates.forEach(({ x, y, cellData }) => {
      const key = `${x},${y}`;
      if (!cellData || cellData.type === 'empty') {
        delete cells[key];
      } else {
        cells[key] = cellData;
      }
    });
    update({ ...maps, [mapId]: { ...map, cells } });
  };

  const clearMap = (mapId) => {
    const map = maps[mapId];
    if (map) update({ ...maps, [mapId]: { ...map, cells: {} } });
  };

  const deleteMap = (mapId) => {
    const next = { ...maps };
    delete next[mapId];
    update(next);
  };

  if (!loaded) return null;

  return (
    <MapContext.Provider value={{ maps, getMap, initMap, resizeMap, setCell, setCells, clearMap, deleteMap }}>
      {children}
    </MapContext.Provider>
  );
}

export const useMap = () => useContext(MapContext);
