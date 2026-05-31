import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Alert, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useDB } from '../context/DBContext';
import { colors, radius } from '../utils/theme';
import { identifyRoom } from '../utils/ai';

let localId = 0;
const tmpId = () => `tmp_${localId++}`;

export default function ScanRoomScreen({ navigation }) {
  const { createFromScan } = useDB();
  const [phase,       setPhase]      = useState('idle');   // idle | scanning | review
  const [reviewData,  setReviewData] = useState(null);     // { roomName, cabinets: [{id, name, shelves: [{id, name}]}] }
  const webFileRef                   = useRef(null);

  const runScan = async (base64) => {
    setPhase('scanning');
    try {
      const result = await identifyRoom(base64);
      // Attach local IDs so we can edit the UI
      const normalised = {
        roomName: result.roomName || 'New Room',
        cabinets: (result.cabinets || []).map(cab => ({
          id: tmpId(),
          name: cab.name || 'Cabinet',
          shelves: (cab.shelves || []).map(s => ({ id: tmpId(), name: s })),
        })),
      };
      setReviewData(normalised);
      setPhase('review');
    } catch (err) {
      setPhase('idle');
      Alert.alert('Scan failed', err.message);
    }
  };

  const pickFromLibrary = async () => {
    if (Platform.OS === 'web') { webFileRef.current?.click(); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) await runScan(result.assets[0].base64);
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') { webFileRef.current?.click(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) await runScan(result.assets[0].base64);
  };

  const handleWebFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => await runScan(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  // ── Review helpers ───────────────────────────────────────────────────────────
  const setRoomName = (name) => setReviewData(d => ({ ...d, roomName: name }));

  const setCabName = (cabId, name) => setReviewData(d => ({
    ...d,
    cabinets: d.cabinets.map(c => c.id === cabId ? { ...c, name } : c),
  }));

  const setShelfName = (cabId, shelfId, name) => setReviewData(d => ({
    ...d,
    cabinets: d.cabinets.map(c =>
      c.id !== cabId ? c : {
        ...c,
        shelves: c.shelves.map(s => s.id === shelfId ? { ...s, name } : s),
      }
    ),
  }));

  const addShelf = (cabId) => setReviewData(d => ({
    ...d,
    cabinets: d.cabinets.map(c =>
      c.id !== cabId ? c : {
        ...c,
        shelves: [...c.shelves, { id: tmpId(), name: '' }],
      }
    ),
  }));

  const removeShelf = (cabId, shelfId) => setReviewData(d => ({
    ...d,
    cabinets: d.cabinets.map(c =>
      c.id !== cabId ? c : { ...c, shelves: c.shelves.filter(s => s.id !== shelfId) }
    ),
  }));

  const addCabinet = () => setReviewData(d => ({
    ...d,
    cabinets: [...d.cabinets, { id: tmpId(), name: '', shelves: [{ id: tmpId(), name: 'Shelf 1' }] }],
  }));

  const removeCabinet = (cabId) => setReviewData(d => ({
    ...d,
    cabinets: d.cabinets.filter(c => c.id !== cabId),
  }));

  const handleConfirm = () => {
    const roomName = reviewData.roomName.trim() || 'New Room';
    const cabinets = reviewData.cabinets
      .filter(c => c.name.trim())
      .map(c => ({
        name:    c.name.trim(),
        shelves: c.shelves.filter(s => s.name.trim()).map(s => s.name.trim()),
      }));

    const newRoomId = createFromScan({ roomName, cabinets });
    navigation.replace('Cabinets', { roomId: newRoomId, roomName });
  };

  // ── Idle phase ───────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {Platform.OS === 'web' && (
          <input ref={webFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWebFile} />
        )}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>Scan Room</Text>
        </View>

        <View style={s.idleBody}>
          <Text style={s.bigIcon}>📷</Text>
          <Text style={s.idleTitle}>Photograph your storage area</Text>
          <Text style={s.idleSub}>
            AI will identify cabinets and shelves from your photo and suggest names.
            You can review and edit everything before it's saved.
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={takePhoto} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>📷  Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={pickFromLibrary} activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>🖼️  Choose from Library</Text>
          </TouchableOpacity>

          <View style={s.tipBox}>
            <Text style={s.tipText}>
              💡 Tip: Include the whole wall or area in the frame for best results.
              Good lighting helps the AI identify storage units accurately.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanning phase ───────────────────────────────────────────────────────────
  if (phase === 'scanning') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={s.scanningText}>AI is analysing your room…</Text>
          <Text style={s.scanningSubText}>This may take a few seconds</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Review phase ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => setPhase('idle')}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Review Structure</Text>
            <Text style={s.headerSub}>Edit names before saving</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.reviewContent} keyboardShouldPersistTaps="handled">

          {/* Room name */}
          <Text style={s.fieldLabel}>ROOM NAME</Text>
          <TextInput
            style={s.fieldInput}
            value={reviewData.roomName}
            onChangeText={setRoomName}
            placeholder="Room name"
            placeholderTextColor={colors.muted}
          />

          {/* Cabinets */}
          {reviewData.cabinets.map((cab, ci) => (
            <View key={cab.id} style={s.cabCard}>
              <View style={s.cabHeader}>
                <Text style={s.cabLabel}>CABINET {ci + 1}</Text>
                <TouchableOpacity onPress={() => removeCabinet(cab.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.removeText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={s.cabInput}
                value={cab.name}
                onChangeText={n => setCabName(cab.id, n)}
                placeholder="Cabinet name"
                placeholderTextColor={colors.muted}
              />

              {/* Shelves */}
              {cab.shelves.map((shelf, si) => (
                <View key={shelf.id} style={s.shelfRow}>
                  <Text style={s.shelfNum}>{si + 1}</Text>
                  <TextInput
                    style={s.shelfInput}
                    value={shelf.name}
                    onChangeText={n => setShelfName(cab.id, shelf.id, n)}
                    placeholder={`Shelf ${si + 1}`}
                    placeholderTextColor={colors.muted}
                  />
                  <TouchableOpacity
                    onPress={() => removeShelf(cab.id, shelf.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={s.addShelfBtn} onPress={() => addShelf(cab.id)}>
                <Text style={s.addShelfBtnText}>+ Add Shelf</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={s.addCabBtn} onPress={addCabinet}>
            <Text style={s.addCabBtnText}>+ Add Cabinet</Text>
          </TouchableOpacity>

        </ScrollView>

        <View style={s.reviewFooter}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setPhase('idle')}>
            <Text style={s.cancelBtnText}>Rescan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
            <Text style={s.confirmBtnText}>
              ✓ Create Room
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  headerSub: { fontSize: 11, color: colors.muted, marginTop: 1 },

  // Idle
  idleBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  bigIcon: { fontSize: 64, opacity: 0.5 },
  idleTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  idleSub: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    width: '100%', backgroundColor: colors.accent, borderRadius: 16,
    padding: 16, alignItems: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    width: '100%', backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 16, alignItems: 'center',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '600', fontSize: 16 },
  tipBox: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, width: '100%',
  },
  tipText: { fontSize: 13, color: colors.muted, lineHeight: 18 },

  // Scanning
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanningText: { fontSize: 16, fontWeight: '700', color: colors.text },
  scanningSubText: { fontSize: 13, color: colors.muted },

  // Review
  reviewContent: { padding: 20, paddingBottom: 20 },
  fieldLabel: { fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 8 },
  fieldInput: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent,
    borderRadius: 12, padding: 14, color: colors.text, fontSize: 16,
    fontWeight: '700', marginBottom: 24,
  },

  cabCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, marginBottom: 12,
  },
  cabHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cabLabel: { fontSize: 10, color: colors.muted, letterSpacing: 1 },
  removeText: { fontSize: 12, color: colors.danger },
  cabInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10, color: colors.text, fontSize: 14,
    fontWeight: '600', marginBottom: 10,
  },

  shelfRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  shelfNum: { fontSize: 12, color: colors.muted, width: 16, textAlign: 'center' },
  shelfInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 8, color: colors.text, fontSize: 13,
  },

  addShelfBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  addShelfBtnText: { fontSize: 13, color: colors.muted },

  addCabBtn: {
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: 14, alignItems: 'center', marginBottom: 20,
  },
  addCabBtnText: { fontSize: 14, color: colors.muted },

  reviewFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.muted, fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.accent },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
