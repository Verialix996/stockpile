import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { colors, radius } from '../utils/theme';

export function ZeroQtyModal({ item, onRemove, onKeep, onCancel }) {
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel} />
      <View style={s.center}>
        <View style={s.box}>

          <View style={s.iconWrap}>
            <Text style={s.icon}>📦</Text>
            <View style={s.zeroBadge}><Text style={s.zeroBadgeText}>0</Text></View>
          </View>

          <Text style={s.title}>"{item.name}" is now out of stock</Text>
          <Text style={s.sub}>Would you like to remove it, or keep it and add it to the restock alert list?</Text>

          <TouchableOpacity style={s.btnKeep} onPress={onKeep} activeOpacity={0.8}>
            <Text style={s.btnKeepIcon}>🔔</Text>
            <View>
              <Text style={s.btnKeepTitle}>Keep & Add to Restock List</Text>
              <Text style={s.btnKeepSub}>Item stays at 0 · added to alerts</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnRemove} onPress={onRemove} activeOpacity={0.8}>
            <Text style={s.btnRemoveIcon}>🗑️</Text>
            <View>
              <Text style={s.btnRemoveTitle}>Remove Item</Text>
              <Text style={s.btnRemoveSub}>Permanently delete from shelf</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.btnCancel} onPress={onCancel}>
            <Text style={s.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  center:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: {
    backgroundColor: colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    padding: 24, width: '100%', maxWidth: 400, alignItems: 'center',
  },
  iconWrap:     { position: 'relative', marginBottom: 16 },
  icon:         { fontSize: 48 },
  zeroBadge: {
    position: 'absolute', bottom: -4, right: -8,
    backgroundColor: colors.danger, borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  zeroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  sub:   { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  btnKeep: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0d2b1a', borderWidth: 1, borderColor: colors.good,
    borderRadius: radius.md, padding: 14, width: '100%', marginBottom: 10,
  },
  btnKeepIcon:  { fontSize: 22 },
  btnKeepTitle: { fontSize: 14, fontWeight: '700', color: colors.good },
  btnKeepSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },

  btnRemove: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a0808', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, padding: 14, width: '100%', marginBottom: 10,
  },
  btnRemoveIcon:  { fontSize: 22 },
  btnRemoveTitle: { fontSize: 14, fontWeight: '700', color: colors.danger },
  btnRemoveSub:   { fontSize: 11, color: colors.muted, marginTop: 2 },

  btnCancel:     { paddingVertical: 10, paddingHorizontal: 20 },
  btnCancelText: { fontSize: 13, color: colors.muted },
});
