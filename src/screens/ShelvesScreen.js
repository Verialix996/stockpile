import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { SectionLabel, EmptyState, Breadcrumb } from '../components/UI';
import { NameModal } from '../components/modals/Modals';
import { colors, radius, CONTAINER_TYPES, CONTAINER_ICONS } from '../utils/theme';

export default function ShelvesScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName } = route.params;
  const { db, addShelf, deleteShelf, renameShelf } = useDB();

  const [showAddShelf,      setShowAddShelf]      = useState(false);
  const [showAddContainer,  setShowAddContainer]  = useState(false);
  const [containerName,     setContainerName]     = useState('');
  const [containerType,     setContainerType]     = useState('Box');
  const [renameTarget,      setRenameTarget]      = useState(null);
  const [fabOpen,           setFabOpen]           = useState(false);

  const allShelves   = db.shelves.filter(s => s.cabinetId === cabinetId);
  const shelves      = allShelves.filter(s => !s.containerType);
  const containers   = allShelves.filter(s => !!s.containerType);

  const itemCount = id => db.items.filter(i => i.shelfId === id).length;

  const handleAddContainer = () => {
    const name = containerName.trim();
    if (!name) return;
    addShelf(cabinetId, name, containerType);
    setContainerName('');
    setContainerType('Box');
    setShowAddContainer(false);
  };

  const ShelfRow = ({ shelf }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('Items', {
        roomId, roomName, cabinetId, cabinetName,
        shelfId: shelf.id, shelfName: shelf.name,
        containerType: shelf.containerType || null,
      })}
      activeOpacity={0.7}
    >
      <View style={s.cardIcon}>
        <Text style={s.cardIconText}>
          {shelf.containerType ? (CONTAINER_ICONS[shelf.containerType] || '📦') : '📦'}
        </Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>{shelf.name}</Text>
        <Text style={s.cardMeta}>
          {shelf.containerType ? `${shelf.containerType} · ` : ''}{itemCount(shelf.id)} items
        </Text>
      </View>
      {shelf.containerType && (
        <View style={s.typeBadge}>
          <Text style={s.typeBadgeText}>{shelf.containerType.toUpperCase()}</Text>
        </View>
      )}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.iconBtn} onPress={() => setRenameTarget(shelf)}>
          <Text style={s.iconBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => deleteShelf(shelf.id)}>
          <Text style={s.iconBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Breadcrumb crumbs={[
        { label: 'Rooms',    onPress: () => navigation.navigate('Rooms') },
        { label: roomName,   onPress: () => navigation.navigate('Cabinets', { roomId, roomName }) },
        { label: cabinetName },
      ]} />

      <FlatList
        data={[...shelves, ...containers]}
        keyExtractor={s => s.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {shelves.length > 0 && <SectionLabel text="Shelves" />}
            {shelves.map(shelf => <ShelfRow key={shelf.id} shelf={shelf} />)}
            {containers.length > 0 && <SectionLabel text="Containers" />}
            {containers.map(shelf => <ShelfRow key={shelf.id} shelf={shelf} />)}
          </>
        }
        renderItem={null}
        ListEmptyComponent={
          <EmptyState icon="📦" text={"No shelves or containers yet.\nTap + to add one."} />
        }
      />

      {/* FAB row */}
      {fabOpen && (
        <TouchableOpacity style={s.fabOverlay} activeOpacity={1} onPress={() => setFabOpen(false)} />
      )}
      <View style={s.fabRow}>
        {fabOpen && (
          <>
            <TouchableOpacity style={s.fabOption} onPress={() => { setFabOpen(false); setShowAddShelf(true); }}>
              <Text style={s.fabOptionText}>📦  Shelf</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fabOption} onPress={() => { setFabOpen(false); setShowAddContainer(true); }}>
              <Text style={s.fabOptionText}>🎒  Container</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={s.fab} onPress={() => setFabOpen(v => !v)} activeOpacity={0.8}>
          <Text style={s.fabText}>{fabOpen ? '×' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Shelf */}
      <NameModal
        visible={showAddShelf}
        title="New Shelf"
        onSave={n => addShelf(cabinetId, n)}
        onClose={() => setShowAddShelf(false)}
      />

      {/* Rename */}
      <NameModal
        visible={!!renameTarget}
        title={renameTarget?.containerType ? `Rename ${renameTarget.containerType}` : 'Rename Shelf'}
        initialValue={renameTarget?.name || ''}
        onSave={n => renameShelf(renameTarget.id, n)}
        onClose={() => setRenameTarget(null)}
      />

      {/* Add Container modal */}
      <Modal
        visible={showAddContainer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContainer(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAddContainer(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Container</Text>

            <Text style={s.sheetLabel}>TYPE</Text>
            <View style={s.typeRow}>
              {CONTAINER_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, containerType === t && s.typeChipActive]}
                  onPress={() => setContainerType(t)}
                >
                  <Text style={s.typeChipIcon}>{CONTAINER_ICONS[t]}</Text>
                  <Text style={[s.typeChipText, containerType === t && s.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sheetLabel}>NAME</Text>
            <TextInput
              style={s.sheetInput}
              value={containerName}
              onChangeText={setContainerName}
              placeholder={`e.g. Tool Bag, First Aid Box`}
              placeholderTextColor={colors.muted}
              autoFocus
            />

            <View style={s.sheetBtns}>
              <TouchableOpacity style={s.sheetBtnGhost} onPress={() => setShowAddContainer(false)}>
                <Text style={s.sheetBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetBtnPrimary, !containerName.trim() && { opacity: 0.4 }]}
                onPress={handleAddContainer}
                disabled={!containerName.trim()}
              >
                <Text style={s.sheetBtnPrimaryText}>Add {containerType}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 120 },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1e2233', alignItems: 'center', justifyContent: 'center',
  },
  cardIconText: { fontSize: 18 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.muted, marginLeft: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 14 },

  typeBadge: {
    backgroundColor: '#1e1a3a', borderWidth: 1, borderColor: colors.accent,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 9, color: colors.accent, fontWeight: '700', letterSpacing: 0.5 },

  fabOverlay: { ...StyleSheet.absoluteFillObject },
  fabRow: {
    position: 'absolute', bottom: 28, right: 20,
    alignItems: 'flex-end', gap: 10,
  },
  fab: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 34 },
  fabOption: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
  },
  fabOptionText: { fontSize: 14, color: colors.text, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 20, textAlign: 'center' },
  sheetLabel: { fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  typeChipActive: { backgroundColor: '#1e1a3a', borderColor: colors.accent },
  typeChipIcon: { fontSize: 16 },
  typeChipText: { fontSize: 14, color: colors.muted, fontWeight: '500' },
  typeChipTextActive: { color: colors.accent, fontWeight: '700' },
  sheetInput: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, color: colors.text, fontSize: 15,
    marginBottom: 20,
  },
  sheetBtns: { flexDirection: 'row', gap: 10 },
  sheetBtnGhost: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  sheetBtnGhostText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  sheetBtnPrimary: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent },
  sheetBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
