import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useDB } from '../context/DBContext';
import { SectionLabel, EmptyState, FAB, Breadcrumb } from '../components/UI';
import { ItemModal } from '../components/modals/Modals';
import { ZeroQtyModal } from '../components/modals/ZeroQtyModal';
import { useQuantityControl } from '../hooks/useQuantityControl';
import { colors, COND_COLOR, CONTAINER_ICONS } from '../utils/theme';
import { loadApiKey, identifyContainerContentsWithClaude } from '../utils/apiKey';

export default function ItemsScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName, shelfId, shelfName, containerType } = route.params;
  const { db, addItem, addItemsBatch, updateItem, deleteItem } = useDB();
  const { inc, dec, zeroTarget, handleRemove, handleKeep, handleCancel } = useQuantityControl();
  const [showAdd, setShowAdd]           = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [quickSet, setQuickSet]         = useState(null);
  const [quickVal, setQuickVal]         = useState('');

  // Scan contents state
  const [scanLoading,  setScanLoading]  = useState(false);
  const [scanItems,    setScanItems]    = useState(null); // array of detected items
  const [scanChecked,  setScanChecked]  = useState({}); // id -> bool
  const webScanRef                      = useRef(null);

  const items = db.items.filter(i => i.shelfId === shelfId);

  const isContainer = !!containerType;
  const containerIcon = CONTAINER_ICONS[containerType] || '📦';

  const runContainerScan = async (base64) => {
    const apiKey = await loadApiKey();
    if (!apiKey) {
      Alert.alert('API Key Required', 'Go to Settings and add your Anthropic API key.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => navigation.navigate('Settings') },
      ]);
      return;
    }
    setScanLoading(true);
    try {
      const detected = await identifyContainerContentsWithClaude(base64, apiKey);
      const withIds = detected.map((item, i) => ({ ...item, _id: String(i) }));
      const checked = {};
      withIds.forEach(item => { checked[item._id] = true; });
      setScanItems(withIds);
      setScanChecked(checked);
    } catch (err) {
      Alert.alert('Scan failed', err.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanContents = async () => {
    if (Platform.OS === 'web') { webScanRef.current?.click(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      await runContainerScan(result.assets[0].base64);
    }
  };

  const handleWebScanFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await runContainerScan(ev.target.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const confirmScanImport = () => {
    const selected = scanItems.filter(item => scanChecked[item._id]);
    if (selected.length === 0) { setScanItems(null); return; }
    addItemsBatch(shelfId, selected.map(({ name, category, notes }) => ({
      name, category: category || 'Other', notes: notes || '', minStock: null,
    })));
    setScanItems(null);
  };

  const openQuickSet = (item) => {
    setQuickSet(item);
    setQuickVal(String(item.quantity));
  };

  const applyQuickSet = () => {
    const val = parseInt(quickVal);
    if (!isNaN(val) && val >= 0) updateItem(quickSet.id, { quantity: val });
    setQuickSet(null);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Platform.OS === 'web' && isContainer && (
        <input ref={webScanRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebScanFile} />
      )}

      <Breadcrumb crumbs={[
        { label: 'Rooms',     onPress: () => navigation.navigate('Rooms') },
        { label: roomName,    onPress: () => navigation.navigate('Cabinets', { roomId, roomName }) },
        { label: cabinetName, onPress: () => navigation.navigate('Shelves', { roomId, roomName, cabinetId, cabinetName }) },
        { label: shelfName },
      ]} />

      {/* Scan Contents button — only for containers */}
      {isContainer && (
        <TouchableOpacity
          style={[s.scanBtn, scanLoading && { opacity: 0.6 }]}
          onPress={handleScanContents}
          disabled={scanLoading}
          activeOpacity={0.8}
        >
          {scanLoading ? (
            <View style={s.scanBtnInner}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={s.scanBtnText}>Scanning contents…</Text>
            </View>
          ) : (
            <View style={s.scanBtnInner}>
              <Text style={{ fontSize: 16 }}>{containerIcon}</Text>
              <Text style={s.scanBtnText}>🤖 Scan {containerType} Contents</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <SectionLabel text={`Items (${items.length})`} />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<EmptyState icon="📦" text="No items yet. Tap + to add one." />}
        renderItem={({ item }) => {
          const expired  = item.expiry && new Date(item.expiry) < new Date();
          const isOut    = item.quantity === 0;
          const isLow    = item.minStock != null && item.minStock > 0 && item.quantity <= item.minStock;
          const qtyColor = isOut ? colors.danger : isLow ? colors.used : colors.text;

          return (
            <View style={[s.card, isOut && s.cardOut, isLow && !isOut && s.cardLow]}>
              {/* Left strip */}
              {(isOut || isLow) && (
                <View style={[s.strip, { backgroundColor: isOut ? colors.danger : colors.used }]} />
              )}

              {/* Tap area → Item Detail */}
              <TouchableOpacity
                style={s.cardMain}
                onPress={() => navigation.navigate('ItemDetail', {
                  roomId, roomName, cabinetId, cabinetName, shelfId, shelfName, itemId: item.id,
                })}
                activeOpacity={0.7}
              >
                <View style={s.iconBox}>
                  <Text style={s.iconText}>📦</Text>
                </View>
                <View style={s.body}>
                  <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {item.category} · {item.condition}
                    {expired ? ' · ⚠️ Expired' : item.expiry ? ` · exp ${item.expiry}` : ''}
                    {isOut ? ' · OUT OF STOCK' : isLow ? ` · LOW (min ${item.minStock})` : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Quantity control */}
              <View style={s.qtyBlock}>
                <TouchableOpacity
                  style={[s.qtyBtn, s.qtyBtnDec, item.quantity <= 0 && s.qtyBtnDisabled]}
                  onPress={() => dec(item)}
                  disabled={item.quantity <= 0}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 4 }}
                >
                  <Text style={s.qtyBtnText}>−</Text>
                </TouchableOpacity>

                {/* Tap number → type exact value */}
                <TouchableOpacity onPress={() => openQuickSet(item)} style={s.qtyValueBtn}>
                  <Text style={[s.qtyValue, { color: qtyColor }]}>{item.quantity}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.qtyBtn, s.qtyBtnInc]}
                  onPress={() => inc(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
                >
                  <Text style={s.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Edit button */}
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => setEditItem(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.editBtnText}>✏️</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <FAB onPress={() => setShowAdd(true)} />

      {/* Add item */}
      <ItemModal
        visible={showAdd}
        onSave={form => addItem(shelfId, form)}
        onClose={() => setShowAdd(false)}
      />

      {/* Edit item */}
      <ItemModal
        visible={!!editItem}
        item={editItem}
        onSave={form => { updateItem(editItem.id, form); setEditItem(null); }}
        onClose={() => setEditItem(null)}
      />

      {/* Zero quantity dialog */}
      <ZeroQtyModal
        item={zeroTarget}
        onRemove={handleRemove}
        onKeep={handleKeep}
        onCancel={handleCancel}
      />

      {/* Scan contents review modal */}
      <Modal
        visible={!!scanItems}
        transparent
        animationType="slide"
        onRequestClose={() => setScanItems(null)}
      >
        <TouchableOpacity style={s.scOverlay} activeOpacity={1} onPress={() => setScanItems(null)} />
        <View style={s.scSheet}>
          <Text style={s.scTitle}>✨ Items detected — select to add</Text>
          <ScrollView style={s.scList} showsVerticalScrollIndicator={false}>
            {(scanItems || []).map(item => (
              <TouchableOpacity
                key={item._id}
                style={s.scRow}
                onPress={() => setScanChecked(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                activeOpacity={0.7}
              >
                <View style={[s.scCheck, scanChecked[item._id] && s.scCheckActive]}>
                  {scanChecked[item._id] && <Text style={s.scCheckMark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.scItemName}>{item.name}</Text>
                  <Text style={s.scItemMeta}>{item.category}{item.notes ? ` · ${item.notes}` : ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.scBtns}>
            <TouchableOpacity style={s.scBtnGhost} onPress={() => setScanItems(null)}>
              <Text style={s.scBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.scBtnPrimary} onPress={confirmScanImport}>
              <Text style={s.scBtnPrimaryText}>
                Add {(scanItems || []).filter(i => scanChecked[i._id]).length} Items
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick-set exact quantity modal */}
      <Modal
        visible={!!quickSet}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickSet(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.qsOverlay} activeOpacity={1} onPress={() => setQuickSet(null)} />
          <View style={s.qsSheet}>
            <Text style={s.qsTitle}>Set quantity — {quickSet?.name}</Text>
            <View style={s.qsRow}>
              <TouchableOpacity
                style={s.qsStepBtn}
                onPress={() => setQuickVal(v => String(Math.max(0, (parseInt(v) || 0) - 1)))}
              >
                <Text style={s.qsStepText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={s.qsInput}
                value={quickVal}
                onChangeText={v => setQuickVal(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
              />
              <TouchableOpacity
                style={s.qsStepBtn}
                onPress={() => setQuickVal(v => String((parseInt(v) || 0) + 1))}
              >
                <Text style={s.qsStepText}>+</Text>
              </TouchableOpacity>
            </View>
            {quickSet?.minStock != null && quickSet.minStock > 0 && (
              <Text style={s.qsHint}>Low stock alert set at {quickSet.minStock}</Text>
            )}
            <View style={s.qsBtns}>
              <TouchableOpacity style={[s.qsBtn, s.qsBtnGhost]} onPress={() => setQuickSet(null)}>
                <Text style={s.qsBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.qsBtn, s.qsBtnPrimary]} onPress={applyQuickSet}>
                <Text style={s.qsBtnPrimaryText}>Set</Text>
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
  list: { paddingHorizontal: 20, paddingBottom: 100 },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
  },
  cardOut: { borderColor: '#4a1a1a', backgroundColor: '#150d0d' },
  cardLow: { borderColor: '#3a2800' },
  strip:   { width: 3, alignSelf: 'stretch' },

  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#1e2233', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },

  // Qty control
  qtyBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    marginRight: 8, paddingVertical: 3,
  },
  qtyBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  qtyBtnDec: { borderRightWidth: 1, borderRightColor: colors.border },
  qtyBtnInc: { borderLeftWidth: 1, borderLeftColor: colors.border },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText: { fontSize: 20, color: colors.accent, lineHeight: 24, fontWeight: '300' },
  qtyValueBtn: { paddingHorizontal: 2 },
  qtyValue: { fontSize: 16, fontWeight: '800', minWidth: 32, textAlign: 'center' },

  editBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  editBtnText: { fontSize: 16 },

  // Quick-set modal
  qsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  qsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40,
  },
  qsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 20, textAlign: 'center' },
  qsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  qsStepBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qsStepText: { fontSize: 28, color: colors.accent, lineHeight: 32, fontWeight: '300' },
  qsInput: {
    width: 100, textAlign: 'center',
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent,
    borderRadius: 14, padding: 12,
    color: colors.text, fontSize: 32, fontWeight: '800',
  },
  qsHint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  qsBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  qsBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  qsBtnPrimary: { backgroundColor: colors.accent },
  qsBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  qsBtnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  qsBtnGhostText: { color: colors.muted, fontWeight: '600', fontSize: 15 },

  // Scan Contents button
  scanBtn: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: '#1a1e2a', borderWidth: 1, borderColor: colors.accent,
    borderRadius: 12, padding: 12,
  },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: colors.accent },

  // Scan results modal
  scOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '75%',
  },
  scTitle: { fontSize: 15, fontWeight: '700', color: colors.accent2, marginBottom: 16, textAlign: 'center' },
  scList: { maxHeight: 320, marginBottom: 16 },
  scRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  scCheck: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scCheckActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  scCheckMark: { fontSize: 13, color: '#fff', fontWeight: '800' },
  scItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  scItemMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  scBtns: { flexDirection: 'row', gap: 10 },
  scBtnGhost: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  scBtnGhostText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  scBtnPrimary: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent },
  scBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
