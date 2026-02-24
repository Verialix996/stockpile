import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, radius } from '../utils/theme';

// ── Icon (simple SVG-like via unicode / emoji fallbacks) ─────────────────────
// We use a minimal path-based approach with react-native-svg-alternative:
// Since we can't use SVG easily without extra deps, we'll use text symbols.
export const ICON_MAP = {
  room:    '🏠', cabinet: '🗄️', shelf: '📦', item: '📦',
  plus:    '+',  search:  '🔍', trash: '🗑️', edit: '✏️',
  photo:   '📷', back:    '←',  close: '×',  chevron: '›',
  box:     '📦', tag:     '🏷️',
};

// ── Row card ─────────────────────────────────────────────────────────────────
export function ListCard({ iconKey, name, meta, onPress, onEdit, onDelete, rightText }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{ICON_MAP[iconKey] || '📦'}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        {meta ? <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {rightText ? <Text style={styles.rightText}>{rightText}</Text> : null}
      {(onEdit || onDelete) && (
        <View style={styles.cardActions}>
          {onEdit && (
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnDanger]} onPress={onDelete}>
              <Text style={styles.iconBtnText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>;
}

// ── Stat bar ──────────────────────────────────────────────────────────────────
export function StatBar({ stats }) {
  return (
    <View style={styles.statBar}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.stat, i > 0 && styles.statBorder]}>
          <Text style={styles.statVal}>{s.value}</Text>
          <Text style={styles.statLbl}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChangeText, placeholder }) {
  return (
    <View style={styles.searchWrap}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search…'}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

// ── FAB ───────────────────────────────────────────────────────────────────────
export function FAB({ onPress }) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, text }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon || '📦'}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
export function Breadcrumb({ crumbs }) {
  if (!crumbs || crumbs.length <= 1) return null;
  return (
    <View style={styles.breadcrumb}>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Text style={styles.breadSep}> › </Text>}
          <TouchableOpacity onPress={c.onPress} disabled={!c.onPress}>
            <Text style={[styles.breadItem, i === crumbs.length - 1 && styles.breadActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────
export function Tag({ text }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

// ── Condition dot ─────────────────────────────────────────────────────────────
export function CondDot({ color }) {
  return <View style={[styles.condDot, { backgroundColor: color }]} />;
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: '#1e2233',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 18 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: 'DMMonoRegular' },
  cardActions: { flexDirection: 'row', gap: 6 },
  rightText: { fontSize: 13, color: colors.muted, marginRight: 4 },
  chevron: { fontSize: 20, color: colors.muted, marginLeft: 2 },

  iconBtn: {
    width: 32, height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { borderColor: colors.border },
  iconBtnText: { fontSize: 14 },

  sectionLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    fontFamily: 'DMMonoRegular',
  },

  statBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.accent2 },
  statLbl: { fontSize: 10, color: colors.muted, fontFamily: 'DMMonoRegular', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

  searchWrap: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.text,
    fontSize: 15,
  },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { fontSize: 28, color: '#fff', lineHeight: 34 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, opacity: 0.3, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  breadItem: { fontSize: 11, color: colors.muted, fontFamily: 'DMMonoRegular' },
  breadActive: { color: colors.accent2 },
  breadSep: { fontSize: 11, color: colors.muted, opacity: 0.4 },

  tag: {
    backgroundColor: '#1e2233',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: colors.accent2, fontFamily: 'DMMonoRegular' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  condDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
});
