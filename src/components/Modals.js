import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, radius, CONDITIONS, CATEGORIES } from '../utils/theme';

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
  const blank = { name: '', category: 'Food', quantity: 1, condition: 'Good', expiry: '', notes: '' };
  const [form, setForm] = useState(item || blank);

  React.useEffect(() => {
    if (visible) setForm(item ? { ...item } : blank);
  }, [visible]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
        <View style={[s.sheet, { maxHeight: '90%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{item ? 'Edit Item' : 'New Item'}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Label text="Name *" />
            <Input value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Olive Oil" autoFocus />

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

            <Label text="Expiry Date (YYYY-MM-DD)" />
            <Input
              value={form.expiry}
              onChangeText={v => set('expiry', v)}
              placeholder="e.g. 2026-12-31"
              keyboardType="numbers-and-punctuation"
            />

            <Label text="Notes" />
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={form.notes}
              onChangeText={v => set('notes', v)}
              placeholder="Optional notes…"
              placeholderTextColor={colors.muted}
              multiline
            />

            <View style={[s.btnRow, { marginBottom: 8 }]}>
              <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={onClose}>
                <Text style={s.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={() => {
                if (!form.name.trim()) return;
                onSave(form);
                onClose();
              }}>
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
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.muted, lineHeight: 22 },

  label: { fontSize: 11, color: colors.muted, letterSpacing: 0.5, marginBottom: 6, fontFamily: 'DMMonoRegular' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 11,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 13, color: colors.muted },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
