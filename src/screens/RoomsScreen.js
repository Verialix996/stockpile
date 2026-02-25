import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { ListCard, SectionLabel, StatBar, SearchBar, EmptyState } from '../components/UI';
import { NameModal } from '../components/Modals';
import { GlobalAddItemModal } from '../components/GlobalAddItemModal';
import { colors, CATEGORIES } from '../utils/theme';

const CATEGORY_EMOJIS = {
  Food: '🍎', Beverages: '🥤', Cleaning: '🧹', Tools: '🔧',
  Electronics: '💡', Clothing: '👕', Documents: '📄', Other: '📦',
};

export default function RoomsScreen({ navigation }) {
  const { db, addRoom, deleteRoom, renameRoom } = useDB();
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState(null); // null = all
  const [showAdd, setShowAdd]           = useState(false);
  const [showAddItem, setShowAddItem]   = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);

  const roomCabinets  = id => db.cabinets.filter(c => c.roomId === id);
  const roomItemCount = id => {
    const cids = roomCabinets(id).map(c => c.id);
    const sids = db.shelves.filter(s => cids.includes(s.cabinetId)).map(s => s.id);
    return db.items.filter(i => sids.includes(i.shelfId)).length;
  };

  // Count items per category for the badge
  const categoryCounts = useMemo(() => {
    const counts = {};
    db.items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [db.items]);

  // Show search/filter results whenever there's a text query OR an active category
  const isFiltering = search.trim().length > 0 || activeCategory !== null;

  const searchResults = useMemo(() => {
    if (!isFiltering) return null;
    return db.items
      .filter(it => {
        const matchesText = search.trim().length === 0 ||
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          (it.category || '').toLowerCase().includes(search.toLowerCase()) ||
          (it.notes || '').toLowerCase().includes(search.toLowerCase());
        const matchesCat = activeCategory === null || it.category === activeCategory;
        return matchesText && matchesCat;
      })
      .map(it => {
        const shelf = db.shelves.find(s => s.id === it.shelfId);
        const cab   = shelf ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
        const room  = cab   ? db.rooms.find(r => r.id === cab.roomId) : null;
        return { ...it, _path: [room?.name, cab?.name, shelf?.name].filter(Boolean).join(' › ') };
      });
  }, [search, activeCategory, db.items, db.shelves, db.cabinets, db.rooms]);

  const handleCategoryPress = (cat) => {
    setActiveCategory(prev => prev === cat ? null : cat); // toggle
  };

  const clearFilters = () => { setSearch(''); setActiveCategory(null); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Stockpile</Text>
          <Text style={s.sub}>{db.rooms.length} rooms · {db.items.length} items</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('MapsList')}>
          <Text style={{ fontSize: 20 }}>🗺️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <StatBar stats={[
        { label: 'Rooms',    value: db.rooms.length },
        { label: 'Cabinets', value: db.cabinets.length },
        { label: 'Shelves',  value: db.shelves.length },
        { label: 'Items',    value: db.items.length },
      ]} />

      {/* Search bar */}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search items by name, category, notes…" />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroll}
        contentContainerStyle={s.chipRow}
      >
        {/* "All" chip */}
        <TouchableOpacity
          style={[s.chip, activeCategory === null && s.chipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[s.chipText, activeCategory === null && s.chipTextActive]}>All</Text>
          <Text style={[s.chipCount, activeCategory === null && s.chipCountActive]}>
            {db.items.length}
          </Text>
        </TouchableOpacity>

        {CATEGORIES.map(cat => {
          const count = categoryCounts[cat] || 0;
          if (count === 0) return null; // hide empty categories
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[s.chip, isActive && s.chipActive]}
              onPress={() => handleCategoryPress(cat)}
            >
              <Text style={s.chipEmoji}>{CATEGORY_EMOJIS[cat]}</Text>
              <Text style={[s.chipText, isActive && s.chipTextActive]}>{cat}</Text>
              <Text style={[s.chipCount, isActive && s.chipCountActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active filter summary + clear */}
      {isFiltering && (
        <View style={s.filterBar}>
          <Text style={s.filterBarText}>
            {searchResults?.length ?? 0} result{searchResults?.length !== 1 ? 's' : ''}
            {activeCategory ? ` in ${activeCategory}` : ''}
            {search.trim() ? ` for "${search.trim()}"` : ''}
          </Text>
          <TouchableOpacity style={s.clearBtn} onPress={clearFilters}>
            <Text style={s.clearBtnText}>✕ Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results or room list */}
      {isFiltering ? (
        <FlatList
          data={searchResults}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <EmptyState
              icon={CATEGORY_EMOJIS[activeCategory] || '🔍'}
              text={activeCategory
                ? `No items in ${activeCategory}`
                : `No items matching "${search}"`}
            />
          }
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
                  roomId: cab?.roomId,
                  roomName: db.rooms.find(r => r.id === cab?.roomId)?.name,
                  cabinetId: cab?.id,
                  cabinetName: cab?.name,
                  shelfId: item.shelfId,
                  shelfName: shelf?.name,
                  itemId: item.id,
                })}
              />
            );
          }}
        />
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

      {/* FAB row */}
      <View style={s.fabRow}>
        <TouchableOpacity style={s.fabSecondary} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Text style={s.fabSecondaryText}>🏠 Room</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.fabPrimary} onPress={() => setShowAddItem(true)} activeOpacity={0.85}>
          <Text style={s.fabPrimaryText}>＋ Add Item</Text>
        </TouchableOpacity>
      </View>

      <NameModal visible={showAdd} title="New Room" onSave={name => addRoom(name)} onClose={() => setShowAdd(false)} />
      <NameModal
        visible={!!renameTarget}
        title="Rename Room"
        initialValue={renameTarget?.name || ''}
        onSave={name => renameRoom(renameTarget.id, name)}
        onClose={() => setRenameTarget(null)}
      />
      <GlobalAddItemModal visible={showAddItem} onClose={() => setShowAddItem(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub:   { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Category chips
  chipScroll: { flexGrow: 0, marginTop: 10 },
  chipRow: { paddingHorizontal: 20, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#1e1a3a', borderColor: colors.accent },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  chipCount: {
    fontSize: 11, color: colors.muted,
    backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden',
  },
  chipCountActive: { color: colors.accent2, backgroundColor: '#0f1f2e' },

  // Active filter bar
  filterBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  filterBarText: { fontSize: 12, color: colors.muted, flex: 1 },
  clearBtn: {
    backgroundColor: '#2b1010', borderWidth: 1, borderColor: colors.danger,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  clearBtnText: { fontSize: 12, color: colors.danger, fontWeight: '600' },

  list: { paddingHorizontal: 20, paddingBottom: 120 },

  // FAB row
  fabRow: {
    position: 'absolute', bottom: 28, right: 20, left: 20,
    flexDirection: 'row', gap: 10, justifyContent: 'flex-end',
  },
  fabPrimary: {
    backgroundColor: colors.accent, borderRadius: 24,
    paddingHorizontal: 22, paddingVertical: 14,
    shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  fabPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fabSecondary: {
    backgroundColor: colors.card, borderRadius: 24,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  fabSecondaryText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
