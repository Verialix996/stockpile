import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadDB, saveDB, uid } from '../utils/db';

const DBContext = createContext(null);

export function DBProvider({ children }) {
  const [db, setDB] = useState(null);

  useEffect(() => {
    loadDB().then(setDB);
  }, []);

  // Poll server every 10 seconds for changes from other devices
  useEffect(() => {
    const interval = setInterval(() => {
      loadDB().then(setDB);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const update = (next) => {
    setDB(next);
    saveDB(next);
  };

  const addRoom = (name) =>
    update({ ...db, rooms: [...db.rooms, { id: uid(), name }] });

  const renameRoom = (id, name) =>
    update({ ...db, rooms: db.rooms.map(r => r.id === id ? { ...r, name } : r) });

  const deleteRoom = (id) => {
    const cids = db.cabinets.filter(c => c.roomId === id).map(c => c.id);
    const sids = db.shelves.filter(s => cids.includes(s.cabinetId)).map(s => s.id);
    update({
      rooms:    db.rooms.filter(r => r.id !== id),
      cabinets: db.cabinets.filter(c => c.roomId !== id),
      shelves:  db.shelves.filter(s => !cids.includes(s.cabinetId)),
      items:    db.items.filter(i => !sids.includes(i.shelfId)),
    });
  };

  const addCabinet = (roomId, name) =>
    update({ ...db, cabinets: [...db.cabinets, { id: uid(), roomId, name }] });

  const renameCabinet = (id, name) =>
    update({ ...db, cabinets: db.cabinets.map(c => c.id === id ? { ...c, name } : c) });

  const deleteCabinet = (id) => {
    const sids = db.shelves.filter(s => s.cabinetId === id).map(s => s.id);
    update({
      ...db,
      cabinets: db.cabinets.filter(c => c.id !== id),
      shelves:  db.shelves.filter(s => s.cabinetId !== id),
      items:    db.items.filter(i => !sids.includes(i.shelfId)),
    });
  };

  const addShelf = (cabinetId, name, containerType = null) =>
    update({ ...db, shelves: [...db.shelves, { id: uid(), cabinetId, name, containerType: containerType || null }] });

  const renameShelf = (id, name) =>
    update({ ...db, shelves: db.shelves.map(s => s.id === id ? { ...s, name } : s) });

  const deleteShelf = (id) =>
    update({
      ...db,
      shelves: db.shelves.filter(s => s.id !== id),
      items:   db.items.filter(i => i.shelfId !== id),
    });

  const addItem = (shelfId, form) =>
    update({ ...db, items: [...db.items, { id: uid(), shelfId, photo: null, ...form }] });

  const addItemsBatch = (shelfId, forms) => {
    const newItems = forms.map(form => ({ id: uid(), shelfId, photo: null, quantity: 1, condition: 'Good', expiry: '', notes: '', ...form }));
    update({ ...db, items: [...db.items, ...newItems] });
  };

  // Create a full room structure from a scan result in one atomic update
  const createFromScan = ({ roomName, cabinets: cabData }) => {
    const newRoomId = uid();
    const newRoom = { id: newRoomId, name: roomName };
    const newCabinets = [];
    const newShelves  = [];
    cabData.forEach(cab => {
      const cabId = uid();
      newCabinets.push({ id: cabId, roomId: newRoomId, name: cab.name });
      (cab.shelves || []).forEach(shelfName => {
        newShelves.push({ id: uid(), cabinetId: cabId, name: shelfName, containerType: null });
      });
    });
    update({
      ...db,
      rooms:    [...db.rooms,    newRoom],
      cabinets: [...db.cabinets, ...newCabinets],
      shelves:  [...db.shelves,  ...newShelves],
    });
    return newRoomId;
  };

  const updateItem = (id, form) =>
    update({ ...db, items: db.items.map(i => i.id === id ? { ...i, ...form } : i) });

  const deleteItem = (id) =>
    update({ ...db, items: db.items.filter(i => i.id !== id) });

  const replaceDB = (newDB) => update(newDB);

  if (!db) return null;

  return (
    <DBContext.Provider value={{
      db,
      addRoom, renameRoom, deleteRoom,
      addCabinet, renameCabinet, deleteCabinet,
      addShelf, renameShelf, deleteShelf,
      addItem, addItemsBatch, updateItem, deleteItem,
      createFromScan,
      replaceDB,
    }}>
      {children}
    </DBContext.Provider>
  );
}

export const useDB = () => useContext(DBContext);
