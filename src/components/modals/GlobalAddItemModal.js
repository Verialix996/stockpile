import React, { useState, useRef, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDB } from '../../context/DBContext';
import { colors, radius, CONDITIONS, CATEGORIES } from '../../utils/theme';
import { identifyItem } from '../../utils/ai';
import { ExpiryPicker } from './Modals';

// ── Small reusable bits ───────────────────────────────────────────────────────
function Label({ text }) {
  return <Text style={s.label}>{text.toUpperCase()}</Text>;
}
function SelectRow({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, value === opt && s.pillActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Filterable dropdown ───────────────────────────────────────────────────────
function LocationDropdown({ label, placeholder, items, value, onChange, disabled }) {
  const [open, setOpen]       = useState(false);
  const [filter, setFilter]   = useState('');

  const selected = items.find(i => i.id === value);
  const filtered = filter.trim()
    ? items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setFilter('');
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Label text={label} />
      <TouchableOpacity
        style={[s.dropdownBtn, disabled && s.dropdownBtnDisabled, open && s.dropdownBtnOpen]}
        onPress={() => { if (!disabled) setOpen(o => !o); }}
        activeOpacity={0.8}
      >
        <Text style={[s.dropdownBtnText, !selected && s.dropdownBtnPlaceholder]} numberOfLines={1}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={s.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={s.dropdownPanel}>
          {/* Filter input */}
          <View style={s.dropdownSearch}>
            <Text style={s.dropdownSearchIcon}>🔍</Text>
            <TextInput
              style={s.dropdownSearchInput}
              value={filter}
              onChangeText={setFilter}
              placeholder={`Filter ${label.toLowerCase()}…`}
              placeholderTextColor={colors.muted}
              autoFocus
            />
            {filter.length > 0 && (
              <TouchableOpacity onPress={() => setFilter('')}>
                <Text style={{ color: colors.muted, fontSize: 16, paddingHorizontal: 6 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Options */}
          <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 && (
              <Text style={s.dropdownEmpty}>No results for "{filter}"</Text>
            )}
            {filtered.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[s.dropdownOption, value === item.id && s.dropdownOptionActive]}
                onPress={() => handleSelect(item.id)}
              >
                <Text style={[s.dropdownOptionText, value === item.id && s.dropdownOptionTextActive]}>
                  {item.name}
                </Text>
                {item.meta ? <Text style={s.dropdownOptionMeta}>{item.meta}</Text> : null}
                {value === item.id && <Text style={{ color: colors.accent2, fontSize: 14 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function GlobalAddItemModal({ visible, onClose }) {
  const { db, addItem } = useDB();

  const blank = { name: '', category: 'Food', quantity: 1, condition: 'Good', expiry: '', notes: '', photo: null, minStock: null };
  const [form, setForm]           = useState(blank);
  const [roomId, setRoomId]       = useState(null);
  const [cabinetId, setCabinetId] = useState(null);
  const [shelfId, setShelfId]     = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [scanError, setScanError] = useState('');
  const webScanRef                = useRef(null);

  // Reset on open
  React.useEffect(() => {
    if (visible) {
      setForm(blank);
      setRoomId(null);
      setCabinetId(null);
      setShelfId(null);
      setScanError('');
    }
  }, [visible]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Cascade resets
  const handleRoomChange = (id) => { setRoomId(id); setCabinetId(null); setShelfId(null); };
  const handleCabinetChange = (id) => { setCabinetId(id); setShelfId(null); };

  // Filtered options for each level
  const roomOptions = db.rooms.map(r => ({
    id: r.id, name: r.name,
    meta: `${db.cabinets.filter(c => c.roomId === r.id).length} cabinets`,
  }));

  const cabinetOptions = useMemo(() => db.cabinets
    .filter(c => c.roomId === roomId)
    .map(c => ({
      id: c.id, name: c.name,
      meta: `${db.shelves.filter(s => s.cabinetId === c.id).length} shelves`,
    })), [roomId, db.cabinets, db.shelves]);

  const shelfOptions = useMemo(() => db.shelves
    .filter(s => s.cabinetId === cabinetId)
    .map(s => ({
      id: s.id, name: s.name,
      meta: `${db.items.filter(i => i.shelfId === s.id).length} items`,
    })), [cabinetId, db.shelves, db.items]);

  // Location path display
  const locationPath = [
    db.rooms.find(r => r.id === roomId)?.name,
    db.cabinets.find(c => c.id === cabinetId)?.name,
    db.shelves.find(s => s.id === shelfId)?.name,
  ].filter(Boolean).join(' › ');

  // ── AI scan ─────────────────────────────────────────────────────────────────
  const runScan = async (base64) => {
    setScanning(true); setScanError('');
    try {
      const result = await identifyItem(base64);
      if (result.name)     set('name',     result.name);
      if (result.category) set('category', result.category);
      if (result.notes)    set('notes',    result.notes);
    } catch (err) {
      setScanError(err.message || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleScan = async () => {
    if (Platform.OS === 'web') { webScanRef.current?.click(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      set('photo', 'data:image/jpeg;base64,' + result.assets[0].base64);
      await runScan(result.assets[0].base64);
    }
  };

  const handleWebScanFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      set('photo', dataUrl);
      await runScan(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const canSave = form.name.trim() && shelfId;

  const handleSave = () => {
    if (!canSave) return;
    addItem(shelfId, form);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {Platform.OS === 'web' && (
        <input ref={webScanRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebScanFile} />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { maxHeight: '94%' }]}>

          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>➕ Add Item</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── AI Scan ── */}
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
                  <Text style={s.scanBtnText}>AI Scan — auto-fill from photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {scanError ? <Text style={s.scanError}>{scanError}</Text> : null}

            {/* ── Divider ── */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>item details</Text>
              <View style={s.dividerLine} />
            </View>

            {/* ── Item fields ── */}
            <Label text="Name *" />
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={v => set('name', v)}
              placeholder="e.g. Olive Oil"
              placeholderTextColor={colors.muted}
            />

            <Label text="Quantity" />
            <TextInput
              style={s.input}
              value={String(form.quantity)}
              onChangeText={v => set('quantity', parseInt(v) || 0)}
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
            />

            <Label text="Condition" />
            <SelectRow options={CONDITIONS} value={form.condition} onChange={v => set('condition', v)} />

            <Label text="Category" />
            <SelectRow options={CATEGORIES} value={form.category} onChange={v => set('category', v)} />

            <Label text="Expiry Date" />
            <ExpiryPicker value={form.expiry} onChange={v => set('expiry', v)} />

            <Label text="Notes" />
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: 'top' }]}
              value={form.notes}
              onChangeText={v => set('notes', v)}
              placeholder="Optional notes…"
              placeholderTextColor={colors.muted}
              multiline
            />

            {/* Low stock alert */}
            <View style={s.alertRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.alertTitle}>🔔 Low Stock Alert</Text>
                <Text style={s.alertSub}>Notify when quantity drops to or below this number</Text>
              </View>
              <TouchableOpacity
                style={[s.alertToggle, form.minStock != null && s.alertToggleOn]}
                onPress={() => set('minStock', form.minStock != null ? null : 1)}
              >
                <Text style={[s.alertToggleText, form.minStock != null && s.alertToggleTextOn]}>
                  {form.minStock != null ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
            {form.minStock != null && (
              <View style={s.alertThresholdRow}>
                <Text style={s.alertThresholdLabel}>Alert when quantity ≤</Text>
                <TouchableOpacity style={s.alertStepBtn} onPress={() => set('minStock', Math.max(1, (form.minStock || 1) - 1))}>
                  <Text style={s.alertStepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.alertThresholdInput}
                  value={String(form.minStock ?? 1)}
                  onChangeText={v => set('minStock', Math.max(1, parseInt(v) || 1))}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity style={s.alertStepBtn} onPress={() => set('minStock', (form.minStock || 1) + 1)}>
                  <Text style={s.alertStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Location section ── */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>location *</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Location path breadcrumb */}
            {locationPath ? (
              <View style={s.locationPath}>
                <Text style={s.locationPathIcon}>📍</Text>
                <Text style={s.locationPathText}>{locationPath}</Text>
              </View>
            ) : (
              <View style={s.locationHint}>
                <Text style={s.locationHintText}>Select a room, cabinet, and shelf below</Text>
              </View>
            )}

            <LocationDropdown
              label="Room"
              placeholder="Select a room…"
              items={roomOptions}
              value={roomId}
              onChange={handleRoomChange}
              disabled={false}
            />

            <LocationDropdown
              label="Cabinet"
              placeholder={roomId ? 'Select a cabinet…' : 'Select a room first'}
              items={cabinetOptions}
              value={cabinetId}
              onChange={handleCabinetChange}
              disabled={!roomId}
            />

            <LocationDropdown
              label="Shelf"
              placeholder={cabinetId ? 'Select a shelf…' : 'Select a cabinet first'}
              items={shelfOptions}
              value={shelfId}
              onChange={setShelfId}
              disabled={!cabinetId}
            />

            {/* Save / Cancel */}
            <View style={[s.btnRow, { marginTop: 8, marginBottom: 8 }]}>
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
                <Text style={s.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, !canSave && s.btnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text style={s.btnPrimaryText}>Save Item</Text>
              </TouchableOpacity>
            </View>

            {/* Hint if not ready to save */}
            {!canSave && (
              <Text style={s.saveHint}>
                {!form.name.trim() && !shelfId ? 'Enter a name and select a shelf to save'
                  : !form.name.trim() ? 'Enter an item name to save'
                  : 'Select a shelf to save'}
              </Text>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.muted, lineHeight: 22 },

  // AI scan
  scanBtn: { backgroundColor: '#1a1e2a', borderWidth: 1, borderColor: colors.accent, borderRadius: radius.md, padding: 13, marginBottom: 6 },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBtnIcon: { fontSize: 18 },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  scanError: { fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: 8 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.muted, letterSpacing: 0.5 },

  // Form
  label: { fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 11, color: colors.text, fontSize: 15, marginBottom: 14,
  },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 13, color: colors.muted },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  // Dropdown
  dropdownBtn: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnOpen: { borderColor: colors.accent },
  dropdownBtnDisabled: { opacity: 0.4 },
  dropdownBtnText: { fontSize: 15, color: colors.text, flex: 1 },
  dropdownBtnPlaceholder: { color: colors.muted },
  dropdownArrow: { fontSize: 10, color: colors.muted, marginLeft: 8 },

  dropdownPanel: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent,
    borderRadius: 10, marginTop: 4, marginBottom: 8, overflow: 'hidden',
  },
  dropdownSearch: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  dropdownSearchIcon: { fontSize: 14, marginRight: 6 },
  dropdownSearchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 4 },
  dropdownEmpty: { color: colors.muted, fontSize: 13, textAlign: 'center', padding: 16 },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownOptionActive: { backgroundColor: '#1e1a3a' },
  dropdownOptionText: { fontSize: 15, color: colors.text, flex: 1 },
  dropdownOptionTextActive: { color: colors.accent, fontWeight: '600' },
  dropdownOptionMeta: { fontSize: 11, color: colors.muted, marginRight: 8 },

  // Location display
  locationPath: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0f2a1a', borderWidth: 1, borderColor: '#2d4a2d',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  locationPathIcon: { fontSize: 14 },
  locationPathText: { fontSize: 13, color: colors.good, fontWeight: '600', flex: 1 },
  locationHint: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10, marginBottom: 14, alignItems: 'center',
  },
  locationHintText: { fontSize: 12, color: colors.muted },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  btnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  saveHint: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 4 },

  // Low stock alert
  alertRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 12, marginBottom: 8, gap: 10,
  },
  alertTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  alertSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },
  alertToggle: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  alertToggleOn: { borderColor: colors.good, backgroundColor: '#0d2b1a' },
  alertToggleText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  alertToggleTextOn: { color: colors.good },
  alertThresholdRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0d2b1a', borderWidth: 1, borderColor: colors.good,
    borderRadius: 12, padding: 10, marginBottom: 14, gap: 10,
  },
  alertThresholdLabel: { flex: 1, fontSize: 13, color: colors.text },
  alertStepBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  alertStepBtnText: { fontSize: 20, color: colors.text, lineHeight: 24 },
  alertThresholdInput: {
    width: 52, textAlign: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.good,
    borderRadius: 8, padding: 6, color: colors.good,
    fontSize: 16, fontWeight: '700',
  },
});
