import React, { useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { colors, radius, COND_COLOR } from '../utils/theme';
import { CondDot, Tag, EmptyState } from '../components/UI';

export default function LowStockScreen({ navigation }) {
  const { db, updateItem } = useDB();

  const lowStockItems = useMemo(() => {
    return db.items
      .filter(i => i.minStock != null && i.minStock > 0 && i.quantity <= i.minStock)
      .map(i => {
        const shelf = db.shelves.find(s => s.id === i.shelfId);
        const cab   = shelf ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
        const room  = cab   ? db.rooms.find(r => r.id === cab.roomId) : null;
        return {
          ...i,
          _path: [room?.name, cab?.name, shelf?.name].filter(Boolean).join(' › '),
          _room: room, _cab: cab, _shelf: shelf,
          _urgent: i.quantity === 0,
        };
      })
      .sort((a, b) => {
        // Out of stock first, then by how far below threshold
        if (a._urgent && !b._urgent) return -1;
        if (!a._urgent && b._urgent) return 1;
        return (a.quantity / a.minStock) - (b.quantity / b.minStock);
      });
  }, [db]);

  const outOfStock  = lowStockItems.filter(i => i.quantity === 0);
  const runningLow  = lowStockItems.filter(i => i.quantity > 0);

  const StockBar = ({ quantity, minStock }) => {
    const pct     = Math.min(1, quantity / minStock);
    const barColor = quantity === 0 ? colors.danger
      : pct <= 0.25 ? '#f97316'
      : colors.used;
    return (
      <View style={b.barWrap}>
        <View style={[b.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
      </View>
    );
  };

  const ItemRow = ({ item }) => (
    <TouchableOpacity
      style={[b.card, item._urgent && b.cardUrgent]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ItemDetail', {
        roomId:      item._room?.id,
        roomName:    item._room?.name,
        cabinetId:   item._cab?.id,
        cabinetName: item._cab?.name,
        shelfId:     item.shelfId,
        shelfName:   item._shelf?.name,
        itemId:      item.id,
      })}
    >
      {/* Left: urgency indicator */}
      <View style={[b.urgencyBar, { backgroundColor: item._urgent ? colors.danger : colors.used }]} />

      <View style={{ flex: 1, gap: 6 }}>
        {/* Name + badge */}
        <View style={b.row}>
          <Text style={b.itemName} numberOfLines={1}>{item.name}</Text>
          {item._urgent
            ? <View style={b.badgeOut}><Text style={b.badgeOutText}>OUT OF STOCK</Text></View>
            : <View style={b.badgeLow}><Text style={b.badgeLowText}>LOW STOCK</Text></View>
          }
        </View>

        {/* Stock bar */}
        <StockBar quantity={item.quantity} minStock={item.minStock} />

        {/* Qty info */}
        <View style={b.row}>
          <Text style={b.qtyText}>
            <Text style={{ color: item._urgent ? colors.danger : colors.used, fontWeight: '700' }}>
              {item.quantity}
            </Text>
            <Text style={{ color: colors.muted }}> / {item.minStock} min</Text>
          </Text>
          <Text style={b.pathText} numberOfLines={1}>{item._path}</Text>
        </View>

        {/* Category + condition */}
        <View style={b.row}>
          <Tag text={item.category} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CondDot color={COND_COLOR[item.condition] || colors.muted} />
            <Text style={b.condText}>{item.condition}</Text>
          </View>
        </View>
      </View>

      <Text style={b.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={b.safe} edges={['top']}>
      {/* Header */}
      <View style={b.header}>
        <TouchableOpacity style={b.backBtn} onPress={() => navigation.goBack()}>
          <Text style={b.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={b.title}>Low Stock</Text>
          <Text style={b.sub}>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need attention</Text>
        </View>
      </View>

      {lowStockItems.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="✅" text={"All items are well stocked!\n\nSet minimum stock levels on items\nto track them here."} />
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {outOfStock.length > 0 && (
                <>
                  <View style={b.sectionHeader}>
                    <Text style={b.sectionDot}>🔴</Text>
                    <Text style={b.sectionTitle}>OUT OF STOCK</Text>
                    <View style={b.sectionBadge}><Text style={b.sectionBadgeText}>{outOfStock.length}</Text></View>
                  </View>
                  {outOfStock.map(item => <ItemRow key={item.id} item={item} />)}
                </>
              )}

              {runningLow.length > 0 && (
                <>
                  <View style={b.sectionHeader}>
                    <Text style={b.sectionDot}>🟡</Text>
                    <Text style={b.sectionTitle}>RUNNING LOW</Text>
                    <View style={b.sectionBadge}><Text style={b.sectionBadgeText}>{runningLow.length}</Text></View>
                  </View>
                  {runningLow.map(item => <ItemRow key={item.id} item={item} />)}
                </>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const b = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub:   { fontSize: 12, color: colors.muted, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  sectionDot: { fontSize: 14 },
  sectionTitle: { fontSize: 11, color: colors.muted, letterSpacing: 1, fontWeight: '600', flex: 1 },
  sectionBadge: {
    backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, marginHorizontal: 20, marginBottom: 8,
    overflow: 'hidden', padding: 14, gap: 12,
  },
  cardUrgent: { borderColor: '#4a1a1a', backgroundColor: '#1a0f0f' },
  urgencyBar: { width: 3, borderRadius: 2, alignSelf: 'stretch' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  arrow: { fontSize: 20, color: colors.muted },

  badgeOut: {
    backgroundColor: '#2b1010', borderWidth: 1, borderColor: colors.danger,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeOutText: { fontSize: 10, color: colors.danger, fontWeight: '700', letterSpacing: 0.5 },
  badgeLow: {
    backgroundColor: '#2b1e00', borderWidth: 1, borderColor: colors.used,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeLowText: { fontSize: 10, color: colors.used, fontWeight: '700', letterSpacing: 0.5 },

  barWrap: {
    height: 4, backgroundColor: colors.surface,
    borderRadius: 2, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 2 },

  qtyText: { fontSize: 13 },
  pathText: { fontSize: 11, color: colors.muted, flex: 1, textAlign: 'right' },
  condText: { fontSize: 11, color: colors.muted },
});
