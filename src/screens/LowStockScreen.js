import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { colors, radius, COND_COLOR } from '../utils/theme';
import { CondDot, Tag, EmptyState } from '../components/UI';
import { ZeroQtyModal } from '../components/ZeroQtyModal';
import { useQuantityControl } from '../hooks/useQuantityControl';

export default function LowStockScreen({ navigation }) {
  const { db, updateItem } = useDB();
  const { inc, dec, zeroTarget, handleRemove, handleKeep, handleCancel } = useQuantityControl();

  const enrichItem = (i) => {
    const shelf = db.shelves.find(s => s.id === i.shelfId);
    const cab   = shelf ? db.cabinets.find(c => c.id === shelf.cabinetId) : null;
    const room  = cab   ? db.rooms.find(r => r.id === cab.roomId)         : null;
    return {
      ...i,
      _path: [room?.name, cab?.name, shelf?.name].filter(Boolean).join(' › '),
      _room: room, _cab: cab, _shelf: shelf,
    };
  };

  // needsRestock = flagged to restock (set when user chose "keep" at 0)
  const restockItems = useMemo(() =>
    db.items.filter(i => i.needsRestock === true).map(enrichItem)
  , [db]);

  // out of stock (qty=0) but NOT flagged — hit zero via minStock alert path
  const outOfStock = useMemo(() =>
    db.items
      .filter(i => i.quantity === 0 && !i.needsRestock)
      .filter(i => i.minStock != null && i.minStock > 0)
      .map(enrichItem)
  , [db]);

  // running low: has minStock, qty > 0 but <= minStock
  const runningLow = useMemo(() =>
    db.items
      .filter(i => i.minStock != null && i.minStock > 0 && i.quantity > 0 && i.quantity <= i.minStock)
      .map(enrichItem)
      .sort((a, b) => (a.quantity / a.minStock) - (b.quantity / b.minStock))
  , [db]);

  const totalAlerts = restockItems.length + outOfStock.length + runningLow.length;

  const clearRestock = (item) =>
    updateItem(item.id, { needsRestock: false });

  // ── Qty bar ──────────────────────────────────────────────────────────────────
  const StockBar = ({ quantity, minStock }) => {
    if (!minStock) return null;
    const pct   = Math.min(1, quantity / minStock);
    const color = quantity === 0 ? colors.danger : pct <= 0.25 ? '#f97316' : colors.used;
    return (
      <View style={b.barWrap}>
        <View style={[b.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
    );
  };

  // ── Item row shared component ─────────────────────────────────────────────
  const ItemRow = ({ item, showBar = true, extraRight }) => (
    <TouchableOpacity
      style={[b.card, item.quantity === 0 && b.cardOut]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ItemDetail', {
        roomId: item._room?.id, roomName: item._room?.name,
        cabinetId: item._cab?.id, cabinetName: item._cab?.name,
        shelfId: item.shelfId, shelfName: item._shelf?.name,
        itemId: item.id,
      })}
    >
      <View style={[b.strip, {
        backgroundColor: item.quantity === 0 ? colors.danger
          : item.needsRestock ? colors.accent
          : colors.used
      }]} />

      <View style={{ flex: 1, gap: 5 }}>
        {/* Name + badge */}
        <View style={b.row}>
          <Text style={b.itemName} numberOfLines={1}>{item.name}</Text>
          {item.needsRestock && <View style={b.badgeRestock}><Text style={b.badgeRestockText}>RESTOCK</Text></View>}
          {item.quantity === 0 && !item.needsRestock && <View style={b.badgeOut}><Text style={b.badgeOutText}>OUT</Text></View>}
          {item.quantity > 0 && item.quantity <= (item.minStock || 0) && <View style={b.badgeLow}><Text style={b.badgeLowText}>LOW</Text></View>}
        </View>

        {showBar && <StockBar quantity={item.quantity} minStock={item.minStock} />}

        {/* Qty + path */}
        <View style={b.row}>
          {/* +/- controls */}
          <View style={b.qtyBlock}>
            <TouchableOpacity
              style={[b.qtyBtn, b.qtyBtnDec, item.quantity <= 0 && b.qtyBtnDisabled]}
              onPress={() => dec(item)}
              disabled={item.quantity <= 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            >
              <Text style={b.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={[b.qtyValue, {
              color: item.quantity === 0 ? colors.danger
                : item.quantity <= (item.minStock || 0) ? colors.used
                : colors.text
            }]}>{item.quantity}</Text>
            <TouchableOpacity
              style={[b.qtyBtn, b.qtyBtnInc]}
              onPress={() => inc(item)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            >
              <Text style={b.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {item.minStock != null && (
            <Text style={b.minText}>min {item.minStock}</Text>
          )}
          <Text style={b.pathText} numberOfLines={1}>{item._path}</Text>
        </View>

        {/* Category + condition + extra action */}
        <View style={b.row}>
          <Tag text={item.category} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CondDot color={COND_COLOR[item.condition] || colors.muted} />
            <Text style={b.condText}>{item.condition}</Text>
          </View>
          {extraRight}
        </View>
      </View>

      <Text style={b.arrow}>›</Text>
    </TouchableOpacity>
  );

  // ── Section header ────────────────────────────────────────────────────────
  const SectionHead = ({ emoji, title, count }) => (
    <View style={b.sectionHeader}>
      <Text style={b.sectionDot}>{emoji}</Text>
      <Text style={b.sectionTitle}>{title}</Text>
      <View style={b.sectionBadge}><Text style={b.sectionBadgeText}>{count}</Text></View>
    </View>
  );

  return (
    <SafeAreaView style={b.safe} edges={['top']}>
      <View style={b.header}>
        <TouchableOpacity style={b.backBtn} onPress={() => navigation.goBack()}>
          <Text style={b.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={b.title}>Alerts</Text>
          <Text style={b.sub}>{totalAlerts} item{totalAlerts !== 1 ? 's' : ''} need attention</Text>
        </View>
      </View>

      {totalAlerts === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="✅" text={"All clear!\n\nSet minimum stock levels on items\nor items at zero will appear here."} />
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <>
              {/* ── Needs Restock ── */}
              {restockItems.length > 0 && (
                <>
                  <SectionHead emoji="🔔" title="NEEDS RESTOCK" count={restockItems.length} />
                  {restockItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      showBar={false}
                      extraRight={
                        <TouchableOpacity
                          style={b.clearBtn}
                          onPress={() => clearRestock(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={b.clearBtnText}>✕ Dismiss</Text>
                        </TouchableOpacity>
                      }
                    />
                  ))}
                </>
              )}

              {/* ── Out of Stock ── */}
              {outOfStock.length > 0 && (
                <>
                  <SectionHead emoji="🔴" title="OUT OF STOCK" count={outOfStock.length} />
                  {outOfStock.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </>
              )}

              {/* ── Running Low ── */}
              {runningLow.length > 0 && (
                <>
                  <SectionHead emoji="🟡" title="RUNNING LOW" count={runningLow.length} />
                  {runningLow.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))}
                </>
              )}
            </>
          }
        />
      )}

      <ZeroQtyModal
        item={zeroTarget}
        onRemove={handleRemove}
        onKeep={handleKeep}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const b = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
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
  sectionDot:  { fontSize: 14 },
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
  cardOut: { borderColor: '#4a1a1a', backgroundColor: '#1a0f0f' },
  strip:   { width: 3, borderRadius: 2, alignSelf: 'stretch' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  arrow:    { fontSize: 20, color: colors.muted },

  badgeRestock: {
    backgroundColor: '#1e1a3a', borderWidth: 1, borderColor: colors.accent,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeRestockText: { fontSize: 10, color: colors.accent, fontWeight: '700', letterSpacing: 0.5 },
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

  barWrap: { height: 4, backgroundColor: colors.surface, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  // Qty control
  qtyBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 3,
  },
  qtyBtn:        { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  qtyBtnDec:     { borderRightWidth: 1, borderRightColor: colors.border },
  qtyBtnInc:     { borderLeftWidth: 1, borderLeftColor: colors.border },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText:    { fontSize: 18, color: colors.accent, lineHeight: 22, fontWeight: '300' },
  qtyValue:      { fontSize: 14, fontWeight: '800', minWidth: 28, textAlign: 'center' },

  minText:  { fontSize: 11, color: colors.muted },
  pathText: { fontSize: 11, color: colors.muted, flex: 1, textAlign: 'right' },
  condText: { fontSize: 11, color: colors.muted },

  clearBtn: {
    backgroundColor: '#1a1010', borderWidth: 1, borderColor: colors.muted,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto',
  },
  clearBtnText: { fontSize: 10, color: colors.muted, fontWeight: '600' },
});
