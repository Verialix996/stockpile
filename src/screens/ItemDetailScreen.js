import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Alert, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useDB } from '../context/DBContext';
import { Breadcrumb, Tag, CondDot } from '../components/UI';
import { ItemModal } from '../components/Modals';
import { colors, COND_COLOR, radius } from '../utils/theme';

export default function ItemDetailScreen({ navigation, route }) {
  const { roomId, roomName, cabinetId, cabinetName, shelfId, shelfName, itemId } = route.params;
  const { db, updateItem, deleteItem } = useDB();
  const [showEdit, setShowEdit] = useState(false);

  const item = db.items.find(i => i.id === itemId);
  const webFileRef = useRef(null);
  if (!item) return null;

  const expired = item.expiry && new Date(item.expiry) < new Date();

  // Web uses a hidden file input; mobile uses ImagePicker
  const handlePhoto = async () => {
    if (Platform.OS === 'web') {
      webFileRef.current?.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      updateItem(itemId, { photo: 'data:image/jpeg;base64,' + result.assets[0].base64 });
    }
  };

  const handleWebFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateItem(itemId, { photo: ev.target.result });
    reader.readAsDataURL(file);
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.name}"?`)) {
        deleteItem(itemId);
        navigation.goBack();
      }
      return;
    }
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteItem(itemId);
        navigation.goBack();
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Hidden web file input */}
      {Platform.OS === 'web' && (
        <input
          ref={webFileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleWebFile}
        />
      )}
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{item.name}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerBtn: { borderColor: colors.border },
  actionBtnText: { fontSize: 16 },

  content: { padding: 20, paddingBottom: 60 },

  photo: {
    width: '100%', height: 200,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 14,
  },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoIcon: { fontSize: 36, opacity: 0.4 },
  photoLabel: { fontSize: 13, color: colors.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  chip: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12,
  },
  chipLabel: { fontSize: 10, color: colors.muted, letterSpacing: 0.5, fontFamily: 'DMMonoRegular' },
  chipValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 3 },

  notes: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  notesText: { fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 },
});
