import React, { useState, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, CONDITIONS, CATEGORIES } from '../../utils/theme';
import { loadApiKey, identifyItemWithClaude } from '../../utils/apiKey';

export function ExpiryPicker({ value, onChange }) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : new Date();

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          backgroundColor: colors.card, border: `1px solid ${colors.border}`,
          borderRadius: 10, padding: 11, color: value ? colors.text : colors.muted,
          fontSize: 15, marginBottom: 14, width: '100%', boxSizing: 'border-box',
          outline: 'none', colorScheme: 'dark',
        }}
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[s.input, { justifyContent: 'center' }]}
        onPress={() => setShow(true)}
      >
        <Text style={{ color: value ? colors.text : colors.muted, fontSize: 15 }}>
          {value || 'No expiry date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShow(Platform.OS === 'ios');
            if (event.type === 'set' && selectedDate) {
              onChange(selectedDate.toISOString().split('T')[0]);
              if (Platform.OS === 'android') setShow(false);
            } else if (event.type === 'dismissed') {
              setShow(false);
            }
          }}
        />
      )}
      {show && Platform.OS === 'ios' && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => { onChange(''); setShow(false); }}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShow(false)}>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

function Label({ text }) {
  return <Text style={s.label}>{text.toUpperCase()}</Text>;
}
function Input({ ...props }) {
  return <TextInput style={s.input} placeholderTextColor={colors.muted} {...props} />;
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

// ── Name modal ────────────────────────────────────────────────────────────────
export function NameModal({ visible, title, initialValue = '', onSave, onClose }) {
  const [val, setVal] = useState(initialValue);
  React.useEffect(() => { if (visible) setVal(initialValue); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>
          <Label text="Name" />
          <Input
            value={val}
            onChangeText={setVal}
            placeholder="Enter name…"
            autoFocus
            onSubmitEditing={() => { if (val.trim()) { onSave(val.trim()); onClose(); } }}
          />
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
              <Text style={s.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => { if (val.trim()) { onSave(val.trim()); onClose(); } }}>
              <Text style={s.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Item modal ────────────────────────────────────────────────────────────────
export function ItemModal({ visible, item, onSave, onClose }) {
  const blank = { name: '', category: 'Food', quantity: 1, condition: 'Good', expiry: '', notes: '', photo: null, minStock: null };
  const [form, setForm]       = useState(item || blank);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const webScanRef            = useRef(null);

  React.useEffect(() => {
    if (visible) { setForm(item ? { ...item } : blank); setScanError(''); }
  }, [visible]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── AI scan ─────────────────────────────────────────────────────────────────
  const runScan = async (base64) => {
    const apiKey = await loadApiKey();
    if (!apiKey) {
      setScanError('No API key. Go to ⚙️ Settings to add your Anthropic key.');
      return;
    }
    setScanning(true);
    setScanError('');
    try {
      const result = await identifyItemWithClaude(base64, apiKey);
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
    // Reset input so same file can be picked again
    e.target.value = '';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Hidden web file input */}
      {Platform.OS === 'web' && (
        <input
          ref={webScanRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebScanFile}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { maxHeight: '92%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{item ? 'Edit Item' : 'New Item'}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* AI Scan button — shown at top for new items */}
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

            {/* Scan error */}
            {scanError ? <Text style={s.scanError}>{scanError}</Text> : null}

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or fill in manually</Text>
              <View style={s.dividerLine} />
            </View>

            <Label text="Name *" />
            <Input value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Olive Oil" />

            <Label text="Quantity" />
            <Input
              value={String(form.quantity)}
              onChangeText={v => set('quantity', parseInt(v) || 0)}
              keyboardType="numeric"
            />

            <Label text="Condition" />
            <SelectRow options={CONDITIONS} value={form.condition} onChange={v => set('condition', v)} />

            <Label text="Category" />
            <SelectRow options={CATEGORIES} value={form.category} onChange={v => set('category', v)} />

            <Label text="Expiry Date" />
            <ExpiryPicker value={form.expiry} onChange={v => set('expiry', v)} />

            <Label text="Notes" />
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
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
                <TouchableOpacity
                  style={s.alertStepBtn}
                  onPress={() => set('minStock', Math.max(1, (form.minStock || 1) - 1))}
                >
                  <Text style={s.alertStepBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.alertThresholdInput}
                  value={String(form.minStock ?? 1)}
                  onChangeText={v => set('minStock', Math.max(1, parseInt(v) || 1))}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={s.alertStepBtn}
                  onPress={() => set('minStock', (form.minStock || 1) + 1)}
                >
                  <Text style={s.alertStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[s.btnRow, { marginBottom: 8 }]}>
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
                <Text style={s.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.btnPrimary, !form.name.trim() && s.btnDisabled]}
                onPress={() => {
                  if (!form.name.trim()) return;
                  onSave(form);
                  onClose();
                }}
                disabled={!form.name.trim()}
              >
                <Text style={s.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>

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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.muted, lineHeight: 22 },

  // AI scan
  scanBtn: {
    backgroundColor: '#1a1e2a', borderWidth: 1, borderColor: colors.accent,
    borderRadius: radius.md, padding: 13, marginBottom: 6,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  scanBtnIcon: { fontSize: 18 },
  scanBtnText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  scanError: { fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: 8 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.muted },

  label: { fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 11, color: colors.text, fontSize: 15, marginBottom: 14,
  },

  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 13, color: colors.muted },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.4 },
  btnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.muted, fontSize: 14, fontWeight: '600' },

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
