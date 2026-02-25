import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Alert, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useDB } from '../context/DBContext';
import { Breadcrumb, Tag, CondDot } from '../components/UI';
import { ItemModal } from '../components/Modals';
import { colors, COND_COLOR, radius } from '../utils/theme';
import { loadApiKey, identifyItemWithClaude } from '../utils/apiKey';

export default function ItemDetailScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName, shelfId, shelfName, itemId } = route.params;
  const { db, updateItem, deleteItem } = useDB();
  const [showEdit, setShowEdit]       = useState(false);
  const [scanning, setScanning]       = useState(false);
  const [scanResult, setScanResult]   = useState(null);
  const webFileRef                    = useRef(null);
  const webScanRef                    = useRef(null);

  const item = db.items.find(i => i.id === itemId);
  if (!item) return null;

  const expired = item.expiry && new Date(item.expiry) < new Date();

  // ── Run Claude scan on a base64 image ───────────────────────────────────────
  const runScan = async (base64) => {
    const apiKey = await loadApiKey();
    if (!apiKey) {
      if (Platform.OS === 'web') {
        window.alert('No API key found.\nGo to Settings → add your Anthropic API key to enable AI recognition.');
      } else {
        Alert.alert(
          'API Key Required',
          'Go to Settings and add your Anthropic API key to enable AI recognition.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
          ]
        );
      }
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      const result = await identifyItemWithClaude(base64, apiKey);
      setScanResult(result);
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Scan failed: ' + err.message);
      } else {
        Alert.alert('Scan failed', err.message);
      }
    } finally {
      setScanning(false);
    }
  };

  // ── Attach photo only (no AI) ────────────────────────────────────────────────
  const handlePhoto = async () => {
    if (Platform.OS === 'web') { webFileRef.current?.click(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      updateItem(itemId, { photo: 'data:image/jpeg;base64,' + result.assets[0].base64 });
    }
  };

  const handleWebFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateItem(itemId, { photo: ev.target.result });
    reader.readAsDataURL(file);
  };

  // ── AI scan: pick photo + identify ──────────────────────────────────────────
  const handleScan = async () => {
    if (Platform.OS === 'web') { webScanRef.current?.click(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      updateItem(itemId, { photo: 'data:image/jpeg;base64,' + result.assets[0].base64 });
      await runScan(result.assets[0].base64);
    }
  };

  const handleWebScanFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      updateItem(itemId, { photo: dataUrl });
      await runScan(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  // ── Apply AI result to item ──────────────────────────────────────────────────
  const applyResult = () => {
    updateItem(itemId, {
      name:     scanResult.name     || item.name,
      category: scanResult.category || item.category,
      notes:    scanResult.notes    || item.notes,
    });
    setScanResult(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.name}"?`)) { deleteItem(itemId); navigation.goBack(); }
      return;
    }
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteItem(itemId); navigation.goBack(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {Platform.OS === 'web' && (
        <>
          <input ref={webFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebFile} />
          <input ref={webScanRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebScanFile} />
        </>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{item.name}</Text>
        <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={s.actionBtnText}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => setShowEdit(true)}>
          <Text style={s.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.dangerBtn]} onPress={handleDelete}>
          <Text style={s.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <Breadcrumb crumbs={[
        { label: 'Rooms',     onPress: () => navigation.navigate('Rooms') },
        { label: roomName,    onPress: () => navigation.navigate('Cabinets', { roomId, roomName }) },
        { label: cabinetName, onPress: () => navigation.navigate('Shelves', { roomId, roomName, cabinetId, cabinetName }) },
        { label: shelfName,   onPress: () => navigation.navigate('Items', { roomId, roomName, cabinetId, cabinetName, shelfId, shelfName }) },
        { label: item.name },
      ]} />

      <ScrollView contentContainerStyle={s.content}>

        {/* Photo */}
        <TouchableOpacity style={s.photo} onPress={handlePhoto} activeOpacity={0.8}>
          {item.photo
            ? <Image source={{ uri: item.photo }} style={s.photoImg} resizeMode="cover" />
            : (
              <View style={s.photoPlaceholder}>
                <Text style={s.photoIcon}>📷</Text>
                <Text style={s.photoLabel}>Tap to add photo</Text>
              </View>
            )
          }
        </TouchableOpacity>

        {/* AI Scan button */}
        <TouchableOpacity
          style={[s.scanBtn, scanning && s.scanBtnDisabled]}
          onPress={handleScan}
          disabled={scanning}
          activeOpacity={0.8}
        >
          {scanning ? (
            <View style={s.scanBtnInner}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={s.scanBtnText}>Identifying item…</Text>
            </View>
          ) : (
            <View style={s.scanBtnInner}>
              <Text style={s.scanBtnIcon}>🤖</Text>
              <Text style={s.scanBtnText}>AI Scan — identify this item</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Scan result */}
        {scanResult && (
          <View style={s.resultCard}>
            <Text style={s.resultTitle}>✨ Claude identified this item</Text>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>NAME</Text>
              <Text style={s.resultValue}>{scanResult.name}</Text>
            </View>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>CATEGORY</Text>
              <Text style={s.resultValue}>{scanResult.category}</Text>
            </View>
            {scanResult.notes ? (
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>NOTES</Text>
                <Text style={s.resultValue}>{scanResult.notes}</Text>
              </View>
            ) : null}
            <View style={s.resultBtns}>
              <TouchableOpacity style={s.resultBtnApply} onPress={applyResult}>
                <Text style={s.resultBtnApplyText}>✓ Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.resultBtnDismiss} onPress={() => setScanResult(null)}>
                <Text style={s.resultBtnDismissText}>✕ Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Detail chips */}
        <View style={s.grid}>
          <View style={s.chip}>
            <Text style={s.chipLabel}>QUANTITY</Text>
            <Text style={s.chipValue}>{item.quantity}</Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipLabel}>CONDITION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <CondDot color={COND_COLOR[item.condition] || colors.muted} />
              <Text style={s.chipValue}>{item.condition}</Text>
            </View>
          </View>
          <View style={s.chip}>
            <Text style={s.chipLabel}>CATEGORY</Text>
            <View style={{ marginTop: 4 }}><Tag text={item.category} /></View>
          </View>
          <View style={s.chip}>
            <Text style={s.chipLabel}>EXPIRY</Text>
            <Text style={[s.chipValue, expired && { color: colors.danger }]}>
              {item.expiry || '—'}
            </Text>
          </View>
        </View>

        {/* Low stock alert status */}
        {item.minStock != null && item.minStock > 0 && (
          <View style={[s.alertStatus, item.quantity <= item.minStock ? s.alertStatusActive : s.alertStatusOk]}>
            <Text style={s.alertStatusIcon}>
              {item.quantity === 0 ? '🔴' : item.quantity <= item.minStock ? '🟡' : '🟢'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertStatusTitle}>
                {item.quantity === 0 ? 'Out of stock'
                  : item.quantity <= item.minStock ? 'Low stock alert triggered'
                  : 'Stock OK'}
              </Text>
              <Text style={s.alertStatusSub}>
                Minimum set to {item.minStock} · Current: {item.quantity}
              </Text>
            </View>
          </View>
        )}

        {item.notes ? (
          <View style={s.notes}>
            <Text style={s.chipLabel}>NOTES</Text>
            <Text style={s.notesText}>{item.notes}</Text>
          </View>
        ) : null}

      </ScrollView>

      <ItemModal
        visible={showEdit}
        item={item}
        onSave={form => updateItem(itemId, form)}
        onClose={() => setShowEdit(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtn: { borderColor: colors.border },
  actionBtnText: { fontSize: 16 },
  content: { padding: 20, paddingBottom: 60 },
  photo: {
    width: '100%', height: 200, backgroundColor: colors.card,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: 10,
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoIcon: { fontSize: 36, opacity: 0.4 },
  photoLabel: { fontSize: 13, color: colors.muted },
  scanBtn: {
    backgroundColor: '#1a1e2a', borderWidth: 1, borderColor: colors.accent,
    borderRadius: radius.md, padding: 13, marginBottom: 14,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBtnIcon: { fontSize: 18 },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  resultCard: {
    backgroundColor: '#0f1f2e', borderWidth: 1, borderColor: colors.accent2,
    borderRadius: radius.lg, padding: 14, marginBottom: 14,
  },
  resultTitle: { fontSize: 13, fontWeight: '700', color: colors.accent2, marginBottom: 12 },
  resultRow: { flexDirection: 'row', marginBottom: 6, gap: 10, alignItems: 'flex-start' },
  resultLabel: { fontSize: 10, color: colors.muted, width: 70, paddingTop: 2 },
  resultValue: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1 },
  resultBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  resultBtnApply: {
    flex: 1, backgroundColor: colors.accent, borderRadius: 10, padding: 10, alignItems: 'center',
  },
  resultBtnApplyText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resultBtnDismiss: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, padding: 10, alignItems: 'center',
  },
  resultBtnDismissText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  chip: {
    flex: 1, minWidth: '45%', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12,
  },
  chipLabel: { fontSize: 10, color: colors.muted, letterSpacing: 0.5 },
  chipValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 3 },
  notes: {
    backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, padding: 12,
  },
  notesText: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
  alertStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1,
  },
  alertStatusActive: { backgroundColor: '#1a100a', borderColor: colors.used },
  alertStatusOk:     { backgroundColor: '#0d1a0d', borderColor: colors.good },
  alertStatusIcon: { fontSize: 18 },
  alertStatusTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  alertStatusSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },
});
