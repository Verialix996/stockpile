import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { ListCard, SectionLabel, StatBar, SearchBar, EmptyState, FAB } from '../components/UI';
import { NameModal } from '../components/Modals';
import { colors } from '../utils/theme';

export default function RoomsScreen({ navigation }) {
  const { db, addRoom, deleteRoom, renameRoom } = useDB();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);

  const roomCabinets = id => db.cabinets.filter(c => c.roomId === id);
  const roomItemCount = id => {
    const cids = roomCabinets(id).map(c => c.id);
    const sids = db.shelves.filter(s => cids.includes(s.cabinetId)).map(s => s.id);
    return db.items.filter(i => sids.includes(i.shelfId)).length;
  };

  // Global search
  const searchResults = search.trim().length > 1 ? db.items.filter(it =>
    it.name.toLowerCase().includes(search.toLowerCase()) ||
    (it.category || '').toLowerCase().includes(search.toLowerCase())
  ).map(it => {
    const shelf = db.shelves.find(s => s.id === it.shelfId);
    const cab   = shelf ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
    const room  = cab   ? db.rooms.find(r => r.id === cab.roomId) : null;
    return { ...it, _path: [room?.name, cab?.name, shelf?.name].filter(Boolean).join(' › ') };
  }) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Stockpile</Text>
          <Text style={s.sub}>{db.rooms.length} rooms · {db.items.length} items</Text>
        </View>
        <TouchableOpacity
          style={s.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <StatBar stats={[
        { label: 'Rooms',    value: db.rooms.length },
        { label: 'Cabinets', value: db.cabinets.length },
        { label: 'Shelves',  value: db.shelves.length },
        { label: 'Items',    value: db.items.length },
      ]} />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search all items…" />

      {searchResults ? (
        <>
          <SectionLabel text={`Results (${searchResults.length})`} />
          <FlatList
            data={searchResults}
            keyExtractor={i => i.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={<EmptyState icon="🔍" text="No items found" />}
            renderItem={({ item }) => {
              const shelf = db.shelves.find(s => s.id === item.shelfId);
              const cab   = shelf ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
              return (
                <ListCard
                  iconKey="box"
                  name={item.name}
                  meta={item._path}
                  rightText={`×${item.quantity}`}
                  onPress={() => navigation.navigate('ItemDetail', {
                    roomId: cab?.roomId, cabinetId: cab?.id,
                    shelfId: item.shelfId, itemId: item.id,
                  })}
                />
              );
            }}
          />
        </>
      ) : (
        <>
          <SectionLabel text="Rooms" />
          <FlatList
            data={db.rooms}
            keyExtractor={r => r.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={<EmptyState icon="🏠" text="No rooms yet. Tap + to add one." />}
            renderItem={({ item: room }) => (
              <ListCard
                iconKey="room"
                name={room.name}
                meta={`${roomCabinets(room.id).length} cabinets · ${roomItemCount(room.id)} items`}
                onPress={() => navigation.navigate('Cabinets', { roomId: room.id, roomName: room.name })}
                onEdit={() => setRenameTarget(room)}
                onDelete={() => deleteRoom(room.id)}
              />
            )}
          />
        </>
      )}

      <FAB onPress={() => setShowAdd(true)} />

      <NameModal
        visible={showAdd}
        title="New Room"
        onSave={name => addRoom(name)}
        onClose={() => setShowAdd(false)}
      />
      <NameModal
        visible={!!renameTarget}
        title="Rename Room"
        initialValue={renameTarget?.name || ''}
        onSave={name => renameRoom(renameTarget.id, name)}
        onClose={() => setRenameTarget(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  settingsBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
