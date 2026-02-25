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
  const { db, addRoom, deleteRoom, renameRoom, updateItem } = useDB();
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAdd, setShowAdd]             = useState(false);
  const [showAddItem, setShowAddItem]     = useState(false);
  const [renameTarget, setRenameTarget]   = useState(null);

  const roomCabinets  = id => db.cabinets.filter(c => c.roomId === id);
  const roomItemCount = id => {
    const cids = roomCabinets(id).map(c => c.id);
    const sids = db.shelves.filter(s => cids.includes(s.cabinetId)).map(s => s.id);
    return db.items.filter(i => sids.includes(i.shelfId)).length;
  };

  const categoryCounts = useMemo(() => {
    const counts = {};
    db.items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return counts;
  }, [db.items]);

  const lowStockCount = useMemo(() =>
    db.items.filter(i => i.minStock != null && i.minStock > 0 && i.quantity <= i.minStock).length
  , [db.items]);

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
        return {
          ...it,
          _path:    [room?.name, cab?.name, shelf?.name].filter(Boolean).join(' › '),
          _roomId:  room?.id,
          _roomName: room?.name,
          _cabId:   cab?.id,
          _cabName: cab?.name,
          _shelf:   shelf,
        };
      });
  }, [search, activeCategory, db.items, db.shelves, db.cabinets, db.rooms]);

  const handleCategoryPress = (cat) => setActiveCategory(prev => prev === cat ? null : cat);
  const clearFilters = () => { setSearch(''); setActiveCategory(null); };

  // Inline qty helpers
  const dec = (item) => { if (item.quantity > 0) updateItem(item.id, { quantity: item.quantity - 1 }); };
  const inc = (item) => updateItem(item.id, { quantity: item.quantity + 1 });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Stockpile</Text>
          <Text style={s.sub}>{db.rooms.length} rooms · {db.items.length} items</Text>
        </View>

        {/* Low stock bell */}
        <TouchableOpacity
          style={[s.iconBtn, lowStockCount > 0 && s.iconBtnAlert]}
          onPress={() => navigation.navigate('LowStock')}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
          {lowStockCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{lowStockCount > 99 ? '99+' : lowStockCount}</Text>
            </View>
          )}
        </TouchableOpacity>

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

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search items by name, category, notes…" />

      {/* Category chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.chipScroll} contentContainerStyle={s.chipRow}
      >
        <TouchableOpacity
          style={[s.chip, activeCategory === null && s.chipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[s.chipText, activeCategory === null && s.chipTextActive]}>All</Text>
          <Text style={[s.chipCount, activeCategory === null && s.chipCountActive]}>{db.items.length}</Text>
        </TouchableOpacity>

        {CATEGORIES.map(cat => {
          const count = categoryCounts[cat] || 0;
          if (count === 0) return null;
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity key={cat} style={[s.chip, isActive && s.chipActive]} onPress={() => handleCategoryPress(cat)}>
              <Text style={s.chipEmoji}>{CATEGORY_EMOJIS[cat]}</Text>
              <Text style={[s.chipText, isActive && s.chipTextActive]}>{cat}</Text>
              <Text style={[s.chipCount, isActive && s.chipCountActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter summary */}
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

      {/* Search results OR room list */}
      {isFiltering ? (
        <FlatList
          data={searchResults}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <EmptyState
              icon={CATEGORY_EMOJIS[activeCategory] || '🔍'}
              text={activeCategory ? `No items in ${activeCategory}` : `No items matching "${search}"`}
            />
          }
          renderItem={({ item }) => {
            const isOut    = item.quantity === 0;
            const isLow    = item.minStock != null && item.minStock > 0 && item.quantity <= item.minStock;
            const qtyColor = isOut ? colors.danger : isLow ? colors.used : colors.text;

            return (
              <View style={[s.itemCard, isOut && s.itemCardOut, isLow && !isOut && s.itemCardLow]}>
                {/* Colored left strip for low/out */}
                {(isOut || isLow) && (
                  <View style={[s.strip, { backgroundColor: isOut ? colors.danger : colors.used }]} />
                )}

                {/* Tap to open detail */}
                <TouchableOpacity
                  style={s.itemCardMain}
                  onPress={() => navigation.navigate('ItemDetail', {
                    roomId:      item._roomId,
                    roomName:    item._roomName,
                    cabinetId:   item._cabId,
                    cabinetName: item._cabName,
                    shelfId:     item.shelfId,
                    shelfName:   item._shelf?.name,
                    itemId:      item.id,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={s.itemIcon}><Text style={{ fontSize: 18 }}>📦</Text></View>
                  <View style={s.itemBody}>
                    <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.itemPath} numberOfLines={1}>{item._path}</Text>
                  </View>
                </TouchableOpacity>

                {/* +/- quantity controls */}
                <View style={s.qtyBlock}>
                  <TouchableOpacity
                    style={[s.qtyBtn, s.qtyBtnDec, item.quantity <= 0 && s.qtyBtnDisabled]}
                    onPress={() => dec(item)}
                    disabled={item.quantity <= 0}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
                  >
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>

                  <Text style={[s.qtyValue, { color: qtyColor }]}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={[s.qtyBtn, s.qtyBtnInc]}
                    onPress={() => inc(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
                  >
                    <Text style={s.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.itemChevron}>›</Text>
              </View>
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
  iconBtnAlert: { borderColor: colors.used, backgroundColor: '#2b1e00' },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.bg,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

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

  // Search result item card
  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, marginBottom: 8, overflow: 'hidden',
  },
  itemCardOut: { borderColor: '#4a1a1a', backgroundColor: '#150d0d' },
  itemCardLow: { borderColor: '#3a2800' },
  strip: { width: 3, alignSelf: 'stretch' },
  itemCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  itemIcon: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: '#1e2233', alignItems: 'center', justifyContent: 'center',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemPath: { fontSize: 11, color: colors.muted, marginTop: 2 },
  itemChevron: { fontSize: 18, color: colors.muted, paddingRight: 10 },

  // Qty controls (same pattern as ItemsScreen)
  qtyBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    marginRight: 4, paddingVertical: 3,
  },
  qtyBtn: {
    width: 30, height: 30,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  qtyBtnDec: { borderRightWidth: 1, borderRightColor: colors.border },
  qtyBtnInc: { borderLeftWidth: 1, borderLeftColor: colors.border },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText: { fontSize: 20, color: colors.accent, lineHeight: 24, fontWeight: '300' },
  qtyValue: { fontSize: 15, fontWeight: '800', minWidth: 30, textAlign: 'center' },

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
