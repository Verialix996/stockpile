import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { ListCard, SectionLabel, EmptyState, FAB, Breadcrumb } from '../components/UI';
import { NameModal } from '../components/modals/Modals';
import { colors } from '../utils/theme';

export default function CabinetsScreen({ navigation, route }) {
  const { roomId, roomName } = route.params;
  const { db, addCabinet, deleteCabinet, renameCabinet } = useDB();
  const [showAdd, setShowAdd] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);

  const cabinets = db.cabinets.filter(c => c.roomId === roomId);
  const cabinetItemCount = id => {
    const sids = db.shelves.filter(s => s.cabinetId === id).map(s => s.id);
    return db.items.filter(i => sids.includes(i.shelfId)).length;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Breadcrumb crumbs={[
        { label: 'Rooms', onPress: () => navigation.navigate('Rooms') },
        { label: roomName },
      ]} />

      <SectionLabel text="Cabinets" />
      <FlatList
        data={cabinets}
        keyExtractor={c => c.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<EmptyState icon="🗄️" text="No cabinets yet. Tap + to add one." />}
        renderItem={({ item: cab }) => (
          <ListCard
            iconKey="cabinet"
            name={cab.name}
            meta={`${db.shelves.filter(s => s.cabinetId === cab.id).length} shelves · ${cabinetItemCount(cab.id)} items`}
            onPress={() => navigation.navigate('Shelves', { roomId, roomName, cabinetId: cab.id, cabinetName: cab.name })}
            onEdit={() => setRenameTarget(cab)}
            onDelete={() => deleteCabinet(cab.id)}
          />
        )}
      />

      <FAB onPress={() => setShowAdd(true)} />

      <NameModal visible={showAdd} title="New Cabinet" onSave={n => addCabinet(roomId, n)} onClose={() => setShowAdd(false)} />
      <NameModal
        visible={!!renameTarget}
        title="Rename Cabinet"
        initialValue={renameTarget?.name || ''}
        onSave={n => renameCabinet(renameTarget.id, n)}
        onClose={() => setRenameTarget(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
