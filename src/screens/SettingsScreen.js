import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDB } from '../context/DBContext';
import { colors, radius } from '../utils/theme';
import { loadServerUrl, saveServerUrl } from '../utils/serverUrl';
import { loadDB } from '../utils/db';
import { buildCSV, downloadCSV, parseCSV, rowsToDB } from '../utils/csvIO';

export default function SettingsScreen({ navigation }) {
  const { db, replaceDB } = useDB();

  // ── Server URL state ─────────────────────────────────────────────────────────
  const [serverUrl, setServerUrl]       = useState('');
  const [serverUrlSaved, setServerUrlSaved] = useState(false);

  // ── Local AI state ───────────────────────────────────────────────────────────
  const [aiStatus,  setAiStatus]  = useState(null);
  const [aiTesting, setAiTesting] = useState(false);

  useEffect(() => {
    loadServerUrl().then(u => setServerUrl(u));
  }, []);

  const [serverUrlError, setServerUrlError] = useState('');

  const handleSaveServerUrl = async () => {
    const trimmed = serverUrl.trim();
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setServerUrlError('URL must start with http:// or https://');
      return;
    }
    setServerUrlError('');
    await saveServerUrl(trimmed);
    const fresh = await loadDB();
    replaceDB(fresh);
    setServerUrlSaved(true);
    setTimeout(() => setServerUrlSaved(false), 2000);
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiStatus(null);
    try {
      const url = await loadServerUrl();
      const res = await fetch(`${url}/ai/status`);
      const data = await res.json();
      setAiStatus(data);
    } catch (e) {
      setAiStatus({ ok: false, error: e.message });
    } finally {
      setAiTesting(false);
    }
  };

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = buildCSV(db);
      await downloadCSV(csv);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Import state ──────────────────────────────────────────────────────────
  const fileInputRef            = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { mode, rows, errors }
  const [pendingRows, setPendingRows]   = useState(null);
  const [pendingMode, setPendingMode]   = useState('replace');
  const [showReplacePrompt, setShowReplacePrompt] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    setShowReplacePrompt(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const { rows, errors } = parseCSV(text);
      setImporting(false);
      setPendingRows(rows);
      setImportResult({ rows, errors });
    };
    reader.onerror = () => { setImporting(false); alert('Could not read file.'); };
    reader.readAsText(file);
  };

  const handleMobileFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', '*/*'] });
      if (result.canceled) return;
      setImporting(true);
      setImportResult(null);
      setShowReplacePrompt(false);
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const { rows, errors } = parseCSV(text);
      setImporting(false);
      setPendingRows(rows);
      setImportResult({ rows, errors });
    } catch (e) {
      setImporting(false);
      alert('Could not read file: ' + e.message);
    }
  };

  const handleConfirmImport = () => {
    if (!pendingRows || pendingRows.length === 0) return;
    if (pendingMode === 'replace') {
      setShowReplacePrompt(true);
      return;
    }
    const newDB = rowsToDB(pendingRows, db, 'merge');
    replaceDB(newDB);
    setImportResult(null);
    setPendingRows(null);
    alert(`✅ Imported ${pendingRows.length} items successfully.`);
  };

  const handleNukeImport = () => {
    const emptyDB = { rooms: [], cabinets: [], shelves: [], items: [] };
    const newDB = rowsToDB(pendingRows, emptyDB, 'replace');
    replaceDB(newDB);
    setImportResult(null);
    setPendingRows(null);
    setShowReplacePrompt(false);
    alert(`✅ Imported ${pendingRows.length} items. All previous data cleared.`);
  };

  const handleReplaceExisting = () => {
    const newDB = rowsToDB(pendingRows, db, 'merge');
    replaceDB(newDB);
    setImportResult(null);
    setPendingRows(null);
    setShowReplacePrompt(false);
    alert(`✅ Imported ${pendingRows.length} items successfully.`);
  };

  // Stats for display
  const totalItems = db.items.length;
  const totalRooms = db.rooms.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Server URL ── */}
        <Text style={s.sectionTitle}>🌐 Server</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>SERVER URL</Text>
          <Text style={s.cardHint}>
            Address of the Stockpile server. Use http://localhost:3747 for the same machine,
            or your server's local IP (e.g. http://192.168.1.50:3747) for phones on the same network.
          </Text>
          <TextInput
            style={[s.keyInput, { marginBottom: 12 }]}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.50:3747"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {serverUrlError ? <Text style={s.errorText}>{serverUrlError}</Text> : null}
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, serverUrlSaved && s.btnSuccess]}
            onPress={handleSaveServerUrl}
          >
            <Text style={s.btnPrimaryText}>{serverUrlSaved ? '✓ Saved!' : 'Save URL'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Local AI ── */}
        <Text style={s.sectionTitle}>🤖 Local AI</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>OLLAMA (LOCAL AI MODEL)</Text>
          <Text style={s.cardHint}>
            AI features use a local Ollama model — no API key or internet needed.
            Run Ollama on your server machine with a vision model (e.g. llava).
            Configure via OLLAMA_URL and OLLAMA_MODEL env vars on the server.
          </Text>
          <TouchableOpacity
            style={[s.btn, s.btnGhost, aiTesting && s.btnDisabled]}
            onPress={handleTestAI}
            disabled={aiTesting}
          >
            {aiTesting
              ? <ActivityIndicator color={colors.accent} size="small" />
              : <Text style={s.btnGhostText}>🔍 Test AI Connection</Text>
            }
          </TouchableOpacity>
          {aiStatus && (
            <View style={[s.keyStatus, { marginTop: 10 }]}>
              <View style={[s.keyStatusDot, { backgroundColor: aiStatus.ok ? colors.good : colors.danger }]} />
              <Text style={[s.keyStatusText, { color: aiStatus.ok ? colors.good : colors.danger }]}>
                {aiStatus.ok
                  ? `Connected — model: ${aiStatus.model}`
                  : `Offline: ${aiStatus.error}`}
              </Text>
            </View>
          )}
        </View>

        {/* ── Export ── */}
        <Text style={s.sectionTitle}>📤 Export Data</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>EXPORT TO CSV</Text>
          <Text style={s.cardHint}>
            Downloads a CSV file with all {totalItems} items across {totalRooms} rooms.
            Includes full location path, quantity, condition, category, expiry, low stock threshold, and notes.
          </Text>

          <View style={s.csvPreview}>
            <Text style={s.csvPreviewText}>
              Room, Cabinet, Shelf, Name, Quantity, Condition, Category, Expiry, MinStock, Notes
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, s.btnPrimary, exportDone && s.btnSuccess, exporting && s.btnDisabled]}
            onPress={handleExport}
            disabled={exporting || totalItems === 0}
          >
            {exporting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnPrimaryText}>
                  {exportDone ? '✓ Downloaded!' : `⬇ Export ${totalItems} Items`}
                </Text>
            }
          </TouchableOpacity>

          {totalItems === 0 && (
            <Text style={s.warnText}>No items to export yet.</Text>
          )}
        </View>

        {/* ── Import ── */}
        <Text style={s.sectionTitle}>📥 Import Data</Text>
        <View style={s.card}>
          <Text style={s.cardLabel}>RESTORE FROM CSV</Text>
          <Text style={s.cardHint}>
            Import a Stockpile-compatible CSV file. Required columns: Room, Cabinet, Shelf, Name.
            Optional: Quantity, Condition, Category, Expiry, MinStock, Notes.
          </Text>

          {/* Mode selector */}
          <Text style={[s.cardLabel, { marginTop: 12 }]}>IMPORT MODE</Text>
          <View style={s.modeRow}>
            <TouchableOpacity
              style={[s.modeBtn, pendingMode === 'replace' && s.modeBtnActive]}
              onPress={() => setPendingMode('replace')}
            >
              <Text style={[s.modeBtnTitle, pendingMode === 'replace' && s.modeBtnTitleActive]}>Replace</Text>
              <Text style={s.modeBtnSub}>Clears all existing data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, pendingMode === 'merge' && s.modeBtnActive]}
              onPress={() => setPendingMode('merge')}
            >
              <Text style={[s.modeBtnTitle, pendingMode === 'merge' && s.modeBtnTitleActive]}>Merge</Text>
              <Text style={s.modeBtnSub}>Adds to existing data</Text>
            </TouchableOpacity>
          </View>

          {/* File picker (web only hidden input) */}
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}

          <TouchableOpacity
            style={[s.btn, s.btnGhost, importing && s.btnDisabled]}
            onPress={Platform.OS === 'web' ? () => fileInputRef.current?.click() : handleMobileFilePick}
            disabled={importing}
          >
            {importing
              ? <ActivityIndicator color={colors.accent} size="small" />
              : <Text style={s.btnGhostText}>📂 Choose CSV File…</Text>
            }
          </TouchableOpacity>

          {/* Parse results */}
          {importResult && (
            <View style={s.importResult}>
              {importResult.errors.length > 0 && (
                <View style={s.importErrors}>
                  <Text style={s.importErrorTitle}>⚠️ {importResult.errors.length} warning{importResult.errors.length !== 1 ? 's' : ''}</Text>
                  {importResult.errors.map((e, i) => (
                    <Text key={i} style={s.importErrorText}>• {e}</Text>
                  ))}
                </View>
              )}

              {importResult.rows.length > 0 ? (
                <>
                  <View style={s.importSummary}>
                    <Text style={s.importSummaryText}>
                      ✅ {importResult.rows.length} item{importResult.rows.length !== 1 ? 's' : ''} ready to import
                    </Text>
                    <Text style={s.importSummaryMode}>
                      Mode: <Text style={{ color: pendingMode === 'replace' ? colors.danger : colors.good }}>
                        {pendingMode === 'replace' ? 'Replace (will clear current data)' : 'Merge (adds to current data)'}
                      </Text>
                    </Text>
                  </View>

                  {showReplacePrompt ? (
                    <>
                      <View style={s.warnBox}>
                        <Text style={[s.warnBoxText, { fontWeight: '700', marginBottom: 4 }]}>How would you like to replace?</Text>
                        <Text style={s.warnBoxText}>• <Text style={{ fontWeight: '700' }}>Nuke All</Text> — delete everything, import only this CSV</Text>
                        <Text style={s.warnBoxText}>• <Text style={{ fontWeight: '700' }}>Replace Existing</Text> — update matching items, add new ones, keep the rest</Text>
                      </View>
                      <View style={s.importBtns}>
                        <TouchableOpacity
                          style={[s.btn, s.btnDanger, { flex: 1 }]}
                          onPress={handleNukeImport}
                        >
                          <Text style={s.btnPrimaryText}>🗑️ Nuke All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.btn, s.btnPrimary, { flex: 1 }]}
                          onPress={handleReplaceExisting}
                        >
                          <Text style={s.btnPrimaryText}>🔄 Replace Existing</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => setShowReplacePrompt(false)}>
                        <Text style={[s.warnText, { marginTop: 8 }]}>← Back</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {pendingMode === 'replace' && (
                        <View style={s.warnBox}>
                          <Text style={s.warnBoxText}>
                            ⚠️ This will permanently delete all {totalItems} current items and replace them with the imported data.
                          </Text>
                        </View>
                      )}
                      <View style={s.importBtns}>
                        <TouchableOpacity
                          style={[s.btn, s.btnGhost, { flex: 1 }]}
                          onPress={() => { setImportResult(null); setPendingRows(null); setShowReplacePrompt(false); }}
                        >
                          <Text style={s.btnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.btn, pendingMode === 'replace' ? s.btnDanger : s.btnPrimary, { flex: 1 }]}
                          onPress={handleConfirmImport}
                        >
                          <Text style={s.btnPrimaryText}>
                            {pendingMode === 'replace' ? '⚠️ Replace All' : '✓ Merge Import'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <Text style={s.warnText}>No valid rows found. Check the file format.</Text>
              )}
            </View>
          )}
        </View>

        {/* ── About ── */}
        <Text style={s.sectionTitle}>ℹ️ About</Text>
        <View style={s.card}>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>App</Text>
            <Text style={s.aboutValue}>Stockpile</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Rooms</Text>
            <Text style={s.aboutValue}>{db.rooms.length}</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Cabinets</Text>
            <Text style={s.aboutValue}>{db.cabinets.length}</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Shelves</Text>
            <Text style={s.aboutValue}>{db.shelves.length}</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>Items</Text>
            <Text style={s.aboutValue}>{db.items.length}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.text },

  content: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 20, marginBottom: 8, letterSpacing: 0.4 },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, marginBottom: 4,
  },
  cardLabel: { fontSize: 10, color: colors.muted, letterSpacing: 1, marginBottom: 4 },
  cardHint:  { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 14 },

  // Local AI status
  keyInput: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 11, color: colors.text, fontSize: 14,
  },
  keyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  keyStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.good },
  keyStatusText: { fontSize: 12, color: colors.good },

  // CSV preview
  csvPreview: {
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    padding: 10, marginBottom: 14,
  },
  csvPreviewText: { fontSize: 11, color: colors.muted, fontFamily: 'monospace' },

  // Import mode
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  modeBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: '#1e1a3a' },
  modeBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  modeBtnTitleActive: { color: colors.accent },
  modeBtnSub: { fontSize: 11, color: colors.muted },

  // Import results
  importResult: { marginTop: 12 },
  importErrors: {
    backgroundColor: '#1a1200', borderWidth: 1, borderColor: colors.used,
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  importErrorTitle: { fontSize: 13, fontWeight: '700', color: colors.used, marginBottom: 6 },
  importErrorText:  { fontSize: 12, color: colors.used, marginBottom: 3, lineHeight: 16 },
  importSummary: {
    backgroundColor: '#0d1a0d', borderWidth: 1, borderColor: colors.good,
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  importSummaryText: { fontSize: 14, fontWeight: '700', color: colors.good },
  importSummaryMode: { fontSize: 12, color: colors.muted, marginTop: 4 },
  warnBox: {
    backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: colors.danger,
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  warnBoxText: { fontSize: 12, color: colors.danger, lineHeight: 18 },
  warnText: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 8 },
  errorText: { fontSize: 12, color: colors.danger, marginBottom: 8 },
  importBtns: { flexDirection: 'row', gap: 10 },

  // Buttons
  btn: { padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnPrimary: { backgroundColor: colors.accent },
  btnSuccess: { backgroundColor: colors.good },
  btnDanger:  { backgroundColor: '#b91c1c' },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { color: colors.text, fontWeight: '600', fontSize: 14 },

  // About
  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  aboutLabel: { fontSize: 13, color: colors.muted },
  aboutValue: { fontSize: 13, fontWeight: '600', color: colors.text },
});
