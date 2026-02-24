import React, { useState } from 'react';
import { View, FlatList, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { ListCard, SectionLabel, EmptyState, FAB, Breadcrumb, CondDot } from '../components/UI';
import { ItemModal } from '../components/Modals';
import { colors, COND_COLOR } from '../utils/theme';

export default function ItemsScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName, shelfId, shelfName } = route.params;
  const { db, addItem } = useDB();
  const [showAdd, setShowAdd] = useState(false);

  const items = db.items.filter(i => i.shelfId === shelfId);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Breadcrumb crumbs={[
        { label: 'Rooms',    onPress: () => navigation.navigate('Rooms') },
        { label: roomName,   onPress: () => navigation.navigate('Cabinets', { roomId, roomName }) },
        { label: cabinetName, onPress: () => navigation.navigate('Shelves', { roomId, roomName, cabinetId, cabinetName }) },
        { label: shelfName },
      ]} />

      <SectionLabel text="Items" />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<EmptyState icon="📦" text="No items yet. Tap + to add one." />}
        renderItem={({ item }) => {
          const expired = item.expiry && new Date(item.expiry) < new Date();
          return (
            <ListCard
              iconKey="box"
              name={item.name}
              meta={`${item.condition} · ${item.category}${item.expiry ? ' · ' + item.expiry : ''}`}
              rightText={`×${item.quantity}`}
              onPress={() => navigation.navigate('ItemDetail', {
                roomId, roomName, cabinetId, cabinetName,
                shelfId, shelfName, itemId: item.id,
              })}
            />
          );
        }}
      />

      <FAB onPress={() => setShowAdd(true)} />

      <ItemModal
        visible={showAdd}
        onSave={form => addItem(shelfId, form)}
        onClose={() => setShowAdd(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
});
