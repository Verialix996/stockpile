import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { saveApiKey, loadApiKey, clearApiKey } from '../utils/apiKey';
import { colors, radius } from '../utils/theme';

export default function SettingsScreen({ navigation }) {
  const [key, setKey]         = useState('');
  const [saved, setSaved]     = useState('');
  const [visible, setVisible] = useState(false);
  const [status, setStatus]   = useState(null); // 'saved' | 'cleared' | null

  useEffect(() => {
    loadApiKey().then(k => { setSaved(k); setKey(k); });
  }, []);

  const handleSave = async () => {
    const trimmed = key.trim();
    await saveApiKey(trimmed);
    setSaved(trimmed);
    setStatus('saved');
    setTimeout(() => setStatus(null), 2500);
  };

  const handleClear = async () => {
    await clearApiKey();
    setSaved('');
    setKey('');
    setStatus('cleared');
    setTimeout(() => setStatus(null), 2500);
  };

  const hasKey    = saved.length > 0;
  const isChanged = key.trim() !== saved;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* AI Recognition section */}
        <Text style={s.sectionLabel}>AI PHOTO RECOGNITION</Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>Claude API Key</Text>
          <Text style={s.cardDesc}>
            Enter your Anthropic API key to enable photo recognition.
            When you take a photo of an item, Claude AI will automatically
            identify it and fill in the name and category for you.
          </Text>

          {/* Status badge */}
          <View style={[s.badge, hasKey ? s.badgeOn : s.badgeOff]}>
            <Text style={[s.badgeText, hasKey ? s.badgeTextOn : s.badgeTextOff]}>
              {hasKey ? '✓ AI Recognition enabled' : '✗ AI Recognition disabled'}
            </Text>
          </View>

          {/* Key input */}
          <Text style={s.label}>API KEY</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={visible ? key : (key ? '•'.repeat(Math.min(key.length, 32)) : '')}
              onChangeText={setVisible ? setKey : undefined}
              onFocus={() => setVisible(true)}
              onBlur={() => setVisible(false)}
              placeholder="sk-ant-xxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
            />
            <TouchableOpacity
              style={s.visibilityBtn}
              onPress={() => setVisible(v => !v)}
            >
              <Text style={s.visibilityBtnText}>{visible ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            {hasKey && (
              <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={handleClear}>
                <Text style={s.btnDangerText}>Remove Key</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, !isChanged && s.btnDisabled]}
              onPress={handleSave}
              disabled={!isChanged}
            >
              <Text style={s.btnPrimaryText}>Save Key</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback toast */}
          {status === 'saved'   && <Text style={s.feedback}>✅ API key saved!</Text>}
          {status === 'cleared' && <Text style={s.feedback}>🗑️ API key removed.</Text>}
        </View>

        {/* How to get a key */}
        <Text style={s.sectionLabel}>HOW TO GET A KEY</Text>
        <View style={s.card}>
          {[
            '1. Go to console.anthropic.com',
            '2. Create a free account',
            '3. Add a small credit ($5 is plenty)',
            '4. Go to API Keys → Create Key',
            '5. Copy and paste it above',
          ].map((step, i) => (
            <Text key={i} style={s.step}>{step}</Text>
          ))}
          <Text style={s.costNote}>
            💡 Each photo scan costs ~$0.003 (less than half a cent).
            $5 credit = ~1,600 scans.
          </Text>
          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => Linking.openURL('https://console.anthropic.com')}
          >
            <Text style={s.linkBtnText}>Open console.anthropic.com →</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy note */}
        <Text style={s.sectionLabel}>PRIVACY</Text>
        <View style={s.card}>
          <Text style={s.cardDesc}>
            Your API key is stored only on this device and is never sent anywhere
            except directly to Anthropic's servers when you use the photo recognition
            feature. It is never shared with anyone else.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },

  content: { padding: 20, paddingBottom: 60 },

  sectionLabel: {
    fontSize: 11, color: colors.muted, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 20,
  },

  card: {
    backgroundColor: colors.card, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.lg, padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  cardDesc:  { fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 14 },

  badge: {
    alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16,
  },
  badgeOn:       { backgroundColor: '#0d2b1a', borderColor: colors.good },
  badgeOff:      { backgroundColor: '#2b1010', borderColor: colors.danger },
  badgeText:     { fontSize: 12, fontWeight: '600' },
  badgeTextOn:   { color: colors.good },
  badgeTextOff:  { color: colors.danger },

  label: { fontSize: 10, color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 11, color: colors.text, fontSize: 14,
  },
  visibilityBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  visibilityBtnText: { fontSize: 16 },

  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  btnDanger: { backgroundColor: '#2b1010', borderWidth: 1, borderColor: colors.danger },
  btnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 14 },

  feedback: { marginTop: 12, fontSize: 13, color: colors.accent2, textAlign: 'center' },

  step: { fontSize: 13, color: colors.text, lineHeight: 26 },
  costNote: {
    fontSize: 12, color: colors.muted, lineHeight: 18,
    marginTop: 10, marginBottom: 14,
    backgroundColor: '#1e2233', borderRadius: 8, padding: 10,
  },
  linkBtn: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  linkBtnText: { color: colors.accent2, fontWeight: '600', fontSize: 14 },
});
