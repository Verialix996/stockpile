import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { useMap } from '../context/MapContext';
import { colors, radius } from '../utils/theme';

export default function MapsListScreen({ navigation }) {
  const { db }      = useDB();
  const { getMap }  = useMap();

  const globalMap = getMap('global');

  const roomMaps = db.rooms.map(room => ({
    ...room,
    map: getMap(room.id),
  }));

  const MapCard = ({ mapId, title, subtitle, emoji, onPress }) => {
    const map = getMap(mapId);
    const cellCount = map ? Object.keys(map.cells).length : 0;
    const hasMap = cellCount > 0;

    return (
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
        <View style={[s.cardPreview, hasMap ? s.cardPreviewFilled : s.cardPreviewEmpty]}>
          <Text style={s.cardPreviewEmoji}>{hasMap ? '🗺️' : '➕'}</Text>
          {map && (
            <Text style={s.cardPreviewSize}>{map.cols}×{map.rows}</Text>
          )}
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardSub}>{subtitle}</Text>
          {hasMap && (
            <View style={s.cardBadge}>
              <Text style={s.cardBadgeText}>
                {cellCount} cells drawn
              </Text>
            </View>
          )}
        </View>
        <Text style={s.cardArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Floor Plans</Text>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <>
            {/* Global map */}
            <Text style={s.sectionLabel}>GLOBAL OVERVIEW</Text>
            <MapCard
              mapId="global"
              title="Whole Home"
              subtitle="Overview of all rooms and cabinets"
              emoji="🏠"
              onPress={() => navigation.navigate('Map', { mapId: 'global', title: 'Whole Home' })}
            />

            {/* Per-room maps */}
            <Text style={s.sectionLabel}>ROOM MAPS</Text>
            {db.rooms.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyText}>No rooms yet. Add rooms first from the home screen.</Text>
              </View>
            )}
            {db.rooms.map(room => (
              <MapCard
                key={room.id}
                mapId={room.id}
                title={room.name}
                subtitle={`${db.cabinets.filter(c => c.roomId === room.id).length} cabinets`}
                emoji="🗺️"
                onPress={() => navigation.navigate('Map', { mapId: room.id, title: room.name })}
              />
            ))}
          </>
        }
        renderItem={() => null}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },

  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11, color: colors.muted, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 20,
  },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 14, marginBottom: 10,
  },
  cardPreview: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardPreviewFilled: { backgroundColor: '#1a2a1a', borderWidth: 1, borderColor: '#2d4a2d' },
  cardPreviewEmpty:  { backgroundColor: '#1e1e2a', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  cardPreviewEmoji: { fontSize: 24 },
  cardPreviewSize: { fontSize: 9, color: colors.muted, marginTop: 2 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#1a2a1a', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#2d4a2d',
  },
  cardBadgeText: { fontSize: 10, color: '#4ade80' },
  cardArrow: { fontSize: 20, color: colors.muted },

  empty: { padding: 20, alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
