import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Modal, PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMap } from '../context/MapContext';
import { useDB } from '../context/DBContext';
import { colors, radius } from '../utils/theme';
import { CELL_TYPES, ROOM_COLORS, emptyMap } from '../utils/mapStorage';

const MAX_GRID = 48;
const MIN_GRID = 8;
const DEFAULT_CELL = 20; // px per cell

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'empty',   label: 'Erase',   emoji: '🧹' },
  { id: 'wall',    label: 'Wall',    emoji: '🧱' },
  { id: 'door',    label: 'Door',    emoji: '🚪' },
  { id: 'window',  label: 'Window',  emoji: '🪟' },
  { id: 'room',    label: 'Room',    emoji: '🎨' },
  { id: 'cabinet', label: 'Cabinet', emoji: '🗄️' },
];

export default function MapScreen({ navigation, route }) {
  const { mapId = 'global', title = 'Home Map' } = route?.params || {};
  const { getMap, initMap, resizeMap, setCells, clearMap } = useMap();
  const { db } = useDB();

  const [activeTool, setActiveTool]         = useState('wall');
  const [activeColor, setActiveColor]       = useState(ROOM_COLORS[0]);
  const [activeCabinet, setActiveCabinet]   = useState(null);
  const [cellSize, setCellSize]             = useState(DEFAULT_CELL);
  const [showSetup, setShowSetup]           = useState(false);
  const [showCabinetPicker, setShowCabinetPicker] = useState(false);
  const [pendingCell, setPendingCell]       = useState(null); // {x,y} waiting for cabinet assignment
  const [showCabinetInfo, setShowCabinetInfo] = useState(null); // cabinet cell tapped in view mode
  const [isDrawing, setIsDrawing]           = useState(false);
  const [editMode, setEditMode]             = useState(true);
  const [colsInput, setColsInput]           = useState('20');
  const [rowsInput, setRowsInput]           = useState('20');
  const drawnCells                          = useRef(new Set());
  const batchRef                            = useRef([]);
  const gridRef                             = useRef(null);
  const gridOffsetRef                       = useRef({ x: 0, y: 0 });

  // Init map if needed
  const map = getMap(mapId);
  useEffect(() => {
    if (!map) initMap(mapId, 20, 20);
  }, [mapId]);

  if (!map) return null;

  const { cols, rows, cells } = map;

  // ── Get grid offset for coordinate calculation ────────────────────────────
  const measureGrid = () => {
    gridRef.current?.measure?.((x, y, w, h, px, py) => {
      gridOffsetRef.current = { x: px, y: py };
    });
  };

  // ── Convert screen coords to grid cell ────────────────────────────────────
  const coordsToCell = (px, py) => {
    const { x: gx, y: gy } = gridOffsetRef.current;
    const col = Math.floor((px - gx) / cellSize);
    const row = Math.floor((py - gy) / cellSize);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { x: col, y: row };
  };

  // ── Paint a cell ──────────────────────────────────────────────────────────
  const paintCell = useCallback((x, y) => {
    const key = `${x},${y}`;
    if (drawnCells.current.has(key)) return;
    drawnCells.current.add(key);

    let cellData = null;

    if (activeTool === 'empty') {
      cellData = null;
    } else if (activeTool === 'room') {
      cellData = { type: 'room', color: activeColor };
    } else if (activeTool === 'cabinet') {
      // Cabinet needs a cabinet assignment — queue it
      if (activeCabinet) {
        const cab = db.cabinets.find(c => c.id === activeCabinet);
        cellData = { type: 'cabinet', cabinetId: activeCabinet, label: cab?.name || 'Cabinet', color: colors.accent };
      } else {
        setPendingCell({ x, y });
        setShowCabinetPicker(true);
        return;
      }
    } else {
      cellData = { type: activeTool };
    }

    batchRef.current.push({ x, y, cellData });
  }, [activeTool, activeColor, activeCabinet, db.cabinets]);

  // ── Flush paint batch ──────────────────────────────────────────────────────
  const flushBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      setCells(mapId, batchRef.current);
      batchRef.current = [];
    }
    drawnCells.current.clear();
    setIsDrawing(false);
  }, [mapId, setCells]);

  // ── PanResponder for touch drawing ────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editMode,
      onMoveShouldSetPanResponder: () => editMode,
      onPanResponderGrant: (e) => {
        if (!editMode) return;
        measureGrid();
        setIsDrawing(true);
        drawnCells.current.clear();
        batchRef.current = [];
        const { pageX, pageY } = e.nativeEvent;
        const cell = coordsToCell(pageX, pageY);
        if (cell) paintCell(cell.x, cell.y);
      },
      onPanResponderMove: (e) => {
        if (!editMode) return;
        const { pageX, pageY } = e.nativeEvent;
        const cell = coordsToCell(pageX, pageY);
        if (cell) paintCell(cell.x, cell.y);
      },
      onPanResponderRelease: () => flushBatch(),
      onPanResponderTerminate: () => flushBatch(),
    })
  ).current;

  // ── Web mouse drawing ─────────────────────────────────────────────────────
  const handleWebMouseDown = (x, y) => {
    if (!editMode) {
      // In view mode, tapping a cabinet opens info
      const key = `${x},${y}`;
      const cell = cells[key];
      if (cell?.type === 'cabinet') setShowCabinetInfo(cell);
      return;
    }
    setIsDrawing(true);
    drawnCells.current.clear();
    batchRef.current = [];
    paintCell(x, y);
  };

  const handleWebMouseEnter = (x, y) => {
    if (!isDrawing || !editMode) return;
    paintCell(x, y);
  };

  const handleWebMouseUp = () => flushBatch();

  // ── Cabinet assigned from picker ──────────────────────────────────────────
  const assignCabinet = (cabinetId) => {
    const cab = db.cabinets.find(c => c.id === cabinetId);
    setActiveCabinet(cabinetId);
    setShowCabinetPicker(false);
    if (pendingCell) {
      setCells(mapId, [{ x: pendingCell.x, y: pendingCell.y, cellData: {
        type: 'cabinet', cabinetId, label: cab?.name || 'Cabinet', color: colors.accent,
      }}]);
      setPendingCell(null);
    }
  };

  // ── Setup modal: resize grid ──────────────────────────────────────────────
  const applyResize = () => {
    const c = Math.min(MAX_GRID, Math.max(MIN_GRID, parseInt(colsInput) || 20));
    const r = Math.min(MAX_GRID, Math.max(MIN_GRID, parseInt(rowsInput) || 20));
    resizeMap(mapId, c, r);
    setShowSetup(false);
  };

  // ── Cell color helper ─────────────────────────────────────────────────────
  const getCellStyle = (key) => {
    const cell = cells[key];
    if (!cell) return null;
    if (cell.type === 'wall')    return { backgroundColor: '#4a4a5a' };
    if (cell.type === 'door')    return { backgroundColor: '#8B5E3C' };
    if (cell.type === 'window')  return { backgroundColor: 'rgba(79,195,247,0.4)' };
    if (cell.type === 'room')    return { backgroundColor: cell.color || ROOM_COLORS[0] };
    if (cell.type === 'cabinet') return { backgroundColor: '#3a2d6a', borderColor: colors.accent, borderWidth: 1 };
    return null;
  };

  const getCellContent = (key) => {
    const cell = cells[key];
    if (!cell) return null;
    if (cell.type === 'door')    return <Text style={s.cellEmoji}>🚪</Text>;
    if (cell.type === 'window')  return <Text style={s.cellEmoji}>🪟</Text>;
    if (cell.type === 'cabinet') return <Text style={s.cellEmoji}>🗄️</Text>;
    return null;
  };

  const gridWidth  = cols * cellSize;
  const gridHeight = rows * cellSize;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity style={s.headerBtn} onPress={() => { setColsInput(String(cols)); setRowsInput(String(rows)); setShowSetup(true); }}>
          <Text style={s.headerBtnText}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.headerBtn, editMode && s.headerBtnActive]} onPress={() => setEditMode(e => !e)}>
          <Text style={s.headerBtnText}>{editMode ? '✏️' : '👁️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.headerBtn} onPress={() => clearMap(mapId)}>
          <Text style={s.headerBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Mode label */}
      <View style={s.modeBadge}>
        <Text style={s.modeBadgeText}>{editMode ? '✏️ Edit mode — drag to draw' : '👁️ View mode — tap cabinets'}</Text>
      </View>

      {/* Toolbar (edit mode only) */}
      {editMode && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolbar} contentContainerStyle={s.toolbarContent}>
          {TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[s.tool, activeTool === tool.id && s.toolActive]}
              onPress={() => setActiveTool(tool.id)}
            >
              <Text style={s.toolEmoji}>{tool.emoji}</Text>
              <Text style={[s.toolLabel, activeTool === tool.id && s.toolLabelActive]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Room color picker */}
          {activeTool === 'room' && (
            <View style={s.colorRow}>
              {ROOM_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatch, { backgroundColor: c }, activeColor === c && s.colorSwatchActive]}
                  onPress={() => setActiveColor(c)}
                />
              ))}
            </View>
          )}

          {/* Active cabinet indicator */}
          {activeTool === 'cabinet' && activeCabinet && (
            <TouchableOpacity style={s.cabinetChip} onPress={() => setShowCabinetPicker(true)}>
              <Text style={s.cabinetChipText}>
                🗄️ {db.cabinets.find(c => c.id === activeCabinet)?.name || 'Cabinet'} ▾
              </Text>
            </TouchableOpacity>
          )}
          {activeTool === 'cabinet' && !activeCabinet && (
            <TouchableOpacity style={s.cabinetChip} onPress={() => setShowCabinetPicker(true)}>
              <Text style={s.cabinetChipText}>Select cabinet ▾</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Zoom controls */}
      <View style={s.zoomRow}>
        <TouchableOpacity style={s.zoomBtn} onPress={() => setCellSize(s => Math.max(12, s - 4))}>
          <Text style={s.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.zoomLabel}>{cellSize}px</Text>
        <TouchableOpacity style={s.zoomBtn} onPress={() => setCellSize(s => Math.min(48, s + 4))}>
          <Text style={s.zoomBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <ScrollView style={s.gridScroll} contentContainerStyle={s.gridScrollContent}>
        <ScrollView horizontal contentContainerStyle={{ paddingBottom: 40 }}>
          {Platform.OS === 'web' ? (
            // ── Web: use mouse events ─────────────────────────────────────
            <div
              ref={gridRef}
              style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, userSelect: 'none', cursor: editMode ? 'crosshair' : 'default' }}
              onMouseUp={handleWebMouseUp}
              onMouseLeave={handleWebMouseUp}
            >
              {Array.from({ length: rows }).map((_, row) =>
                Array.from({ length: cols }).map((_, col) => {
                  const key = `${col},${row}`;
                  const cellStyle = getCellStyle(key);
                  const content = getCellContent(key);
                  return (
                    <div
                      key={key}
                      onMouseDown={() => handleWebMouseDown(col, row)}
                      onMouseEnter={() => handleWebMouseEnter(col, row)}
                      style={{
                        width: cellSize, height: cellSize,
                        border: '1px solid rgba(255,255,255,0.06)',
                        backgroundColor: cellStyle?.backgroundColor || 'transparent',
                        boxSizing: 'border-box',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: cellSize > 18 ? 12 : 8,
                        cursor: editMode ? 'crosshair' : (cells[key]?.type === 'cabinet' ? 'pointer' : 'default'),
                        borderColor: cellStyle?.borderColor || 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // ── Mobile: use PanResponder ──────────────────────────────────
            <View
              ref={gridRef}
              onLayout={measureGrid}
              style={{ width: gridWidth, height: gridHeight }}
              {...panResponder.panHandlers}
            >
              {Array.from({ length: rows }).map((_, row) => (
                <View key={row} style={{ flexDirection: 'row' }}>
                  {Array.from({ length: cols }).map((_, col) => {
                    const key = `${col},${row}`;
                    const cellStyle = getCellStyle(key);
                    const content = getCellContent(key);
                    return (
                      <View
                        key={key}
                        style={[
                          { width: cellSize, height: cellSize, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
                          cellStyle,
                        ]}
                      >
                        {content}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </ScrollView>

      {/* Legend */}
      <View style={s.legend}>
        {[
          { color: '#4a4a5a', label: 'Wall' },
          { color: '#8B5E3C', label: 'Door' },
          { color: 'rgba(79,195,247,0.4)', label: 'Window' },
          { color: ROOM_COLORS[0], label: 'Room' },
          { color: '#3a2d6a', label: 'Cabinet' },
        ].map(item => (
          <View key={item.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: item.color }]} />
            <Text style={s.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Setup modal ────────────────────────────────────────────────── */}
      <Modal visible={showSetup} transparent animationType="slide" onRequestClose={() => setShowSetup(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSetup(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Grid Size</Text>
          <Text style={s.sheetNote}>⚠️ Resizing clears the current map</Text>
          <Text style={s.sheetNote}>Max: {MAX_GRID} · Min: {MIN_GRID}</Text>
          <View style={s.sizeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>COLUMNS</Text>
              <TextInput
                style={s.sizeInput}
                value={colsInput}
                onChangeText={setColsInput}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <Text style={s.sizeSep}>×</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>ROWS</Text>
              <TextInput
                style={s.sizeInput}
                value={rowsInput}
                onChangeText={setRowsInput}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
          <View style={s.sheetBtns}>
            <TouchableOpacity style={[s.sheetBtn, s.sheetBtnGhost]} onPress={() => setShowSetup(false)}>
              <Text style={s.sheetBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetBtn, s.sheetBtnPrimary]} onPress={applyResize}>
              <Text style={s.sheetBtnPrimaryText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cabinet picker modal ───────────────────────────────────────── */}
      <Modal visible={showCabinetPicker} transparent animationType="slide" onRequestClose={() => setShowCabinetPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCabinetPicker(false)} />
        <View style={[s.sheet, { maxHeight: '70%' }]}>
          <Text style={s.sheetTitle}>Select Cabinet</Text>
          <ScrollView>
            {db.cabinets.length === 0 && (
              <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>
                No cabinets yet. Add rooms and cabinets first.
              </Text>
            )}
            {db.cabinets.map(cab => {
              const room = db.rooms.find(r => r.id === cab.roomId);
              return (
                <TouchableOpacity key={cab.id} style={s.cabinetPickerRow} onPress={() => assignCabinet(cab.id)}>
                  <Text style={s.cabinetPickerEmoji}>🗄️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cabinetPickerName}>{cab.name}</Text>
                    <Text style={s.cabinetPickerRoom}>{room?.name || ''}</Text>
                  </View>
                  {activeCabinet === cab.id && <Text style={{ color: colors.accent2 }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Cabinet info modal (view mode) ────────────────────────────── */}
      {showCabinetInfo && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowCabinetInfo(null)}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCabinetInfo(null)} />
          <View style={s.infoSheet}>
            <Text style={s.infoTitle}>🗄️ {showCabinetInfo.label}</Text>
            {(() => {
              const cab = db.cabinets.find(c => c.id === showCabinetInfo.cabinetId);
              const room = cab ? db.rooms.find(r => r.id === cab.roomId) : null;
              const shelfCount = db.shelves.filter(s => s.cabinetId === cab?.id).length;
              const sids = db.shelves.filter(s => s.cabinetId === cab?.id).map(s => s.id);
              const itemCount = db.items.filter(i => sids.includes(i.shelfId)).length;
              return (
                <View>
                  <Text style={s.infoMeta}>{room?.name} · {shelfCount} shelves · {itemCount} items</Text>
                  <View style={s.sheetBtns}>
                    <TouchableOpacity style={[s.sheetBtn, s.sheetBtnGhost]} onPress={() => setShowCabinetInfo(null)}>
                      <Text style={s.sheetBtnGhostText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.sheetBtn, s.sheetBtnPrimary]}
                      onPress={() => {
                        setShowCabinetInfo(null);
                        if (cab && room) {
                          navigation.navigate('Shelves', {
                            roomId: room.id, roomName: room.name,
                            cabinetId: cab.id, cabinetName: cab.name,
                          });
                        }
                      }}
                    >
                      <Text style={s.sheetBtnPrimaryText}>Open Cabinet →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { fontSize: 18, color: colors.text },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  headerBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnActive: { borderColor: colors.accent, backgroundColor: '#1e1a3a' },
  headerBtnText: { fontSize: 16 },

  modeBadge: {
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start',
  },
  modeBadgeText: { fontSize: 11, color: colors.muted },

  toolbar: { flexGrow: 0, marginBottom: 6 },
  toolbarContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tool: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  toolActive: { borderColor: colors.accent, backgroundColor: '#1e1a3a' },
  toolEmoji: { fontSize: 18 },
  toolLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  toolLabelActive: { color: colors.accent },

  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  colorSwatch: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#fff' },

  cabinetChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.accent, backgroundColor: '#1e1a3a',
    marginLeft: 8,
  },
  cabinetChipText: { fontSize: 12, color: colors.accent, fontWeight: '600' },

  zoomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginBottom: 8,
  },
  zoomBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 20, color: colors.text, lineHeight: 24 },
  zoomLabel: { fontSize: 12, color: colors.muted, width: 40, textAlign: 'center' },

  gridScroll: { flex: 1 },
  gridScrollContent: { padding: 16 },
  cellEmoji: { fontSize: 10 },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    padding: 12, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 11, color: colors.muted },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  infoSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sheetNote: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 20 },
  sizeSep: { fontSize: 20, color: colors.muted, marginTop: 16 },
  inputLabel: { fontSize: 10, color: colors.muted, letterSpacing: 0.5, marginBottom: 6 },
  sizeInput: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, color: colors.text, fontSize: 18,
    fontWeight: '700', textAlign: 'center',
  },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  sheetBtn: { flex: 1, padding: 13, borderRadius: 12, alignItems: 'center' },
  sheetBtnPrimary: { backgroundColor: colors.accent },
  sheetBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheetBtnGhost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  sheetBtnGhostText: { color: colors.muted, fontWeight: '600', fontSize: 14 },

  cabinetPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cabinetPickerEmoji: { fontSize: 20 },
  cabinetPickerName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cabinetPickerRoom: { fontSize: 12, color: colors.muted, marginTop: 1 },

  infoTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  infoMeta: { fontSize: 13, color: colors.muted, marginBottom: 20 },
});
