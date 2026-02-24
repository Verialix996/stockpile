import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { ListCard, SectionLabel, EmptyState, FAB, Breadcrumb } from '../components/UI';
import { NameModal } from '../components/Modals';
import { colors } from '../utils/theme';

export default function ShelvesScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName } = route.params;
  const { db, addShelf, deleteShelf, renameShelf } = useDB();
  const [showAdd, setShowAdd] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);

  const shelves = db.shelves.filter(s => s.cabinetId === cabinetId);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Breadcrumb crumbs={[
        { label: 'Rooms',    onPress: () => navigation.navigate('Rooms') },
        { label: roomName,   onPress: () => navigation.navigate('Cabinets', { roomId, roomName }) },
        { label: cabinetName },
      ]} />

      <SectionLabel text="Shelves" />
      <FlatList
        data={shelves}
        keyExtractor={s => s.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<EmptyState icon="📦" text="No shelves yet. Tap + to add one." />}
        renderItem={({ item: shelf }) => (
          <ListCard
            iconKey="shelf"
            name={shelf.name}
            meta={`${db.items.filter(i => i.shelfId === shelf.id).length} items`}
            onPress={() => navigation.navigate('Items', { roomId, roomName, cabinetId, cabinetName, shelfId: shelf.id, shelfName: shelf.name })}
            onEdit={() => setRenameTarget(shelf)}
            onDelete={() => deleteShelf(shelf.id)}
          />
        )}
      />

      <FAB onPress={() => setShowAdd(true)} />

      <NameModal visible={showAdd} title="New Shelf" onSave={n => addShelf(cabinetId, n)} onClose={() => setShowAdd(false)} />
      <NameModal
        visible={!!renameTarget}
        title="Rename Shelf"
        initialValue={renameTarget?.name || ''}
        onSave={n => renameShelf(renameTarget.id, n)}
        onClose={() => setRenameTarget(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
