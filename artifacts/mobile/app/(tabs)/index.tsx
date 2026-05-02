import React, { useState, useMemo } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import LightweightChart, { IndicatorConfig, DrawingTool } from "@/components/LightweightChart";
import SymbolSelector from "@/components/SymbolSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import PriceBar from "@/components/PriceBar";
import CoinLogo from "@/components/CoinLogo";
import { MarketSymbol, SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { width: SW, height: SH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

function fmtPrice(price: number, mode: "usd" | "inr", usdToInr: number): string {
  const sym = mode === "usd" ? "$" : "₹";
  if (!price) return `${sym}—`;
  const p = mode === "inr" ? price * usdToInr : price;
  if (p >= 100000) return `${sym}${p.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  if (p >= 10000)  return `${sym}${p.toLocaleString(mode === "usd" ? "en-US" : "en-IN", { maximumFractionDigits: 2 })}`;
  if (p >= 1)      return `${sym}${p.toFixed(2)}`;
  return `${sym}${p.toFixed(4)}`;
}

function WatchlistRow({
  symbol, isSelected, price, change24h, currencyMode, usdToInr, onPress, colors, isLast,
}: {
  symbol: MarketSymbol; isSelected: boolean; price: number;
  change24h: number; currencyMode: "usd" | "inr"; usdToInr: number;
  onPress: () => void; colors: any; isLast: boolean;
}) {
  const ticker = symbol.label.replace("/USDT", "");
  const isPos = change24h >= 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        isSelected && { backgroundColor: colors.muted },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.rowLeft}>
        <CoinLogo symbolId={symbol.id} size={36} />
        <View>
          <Text style={[styles.coinName, { color: colors.foreground }]}>{ticker}</Text>
          <Text style={[styles.coinSub, { color: colors.mutedForeground }]}>{symbol.name}</Text>
        </View>
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.priceText, { color: colors.foreground }]}>{fmtPrice(price, currencyMode, usdToInr)}</Text>
      </View>
      <View style={styles.rowRight}>
        {change24h !== 0 ? (
          <View style={[styles.badge, { backgroundColor: isPos ? colors.bullBg : colors.bearBg }]}>
            <Text style={[styles.badgeText, { color: isPos ? colors.bull : colors.bear }]}>
              {isPos ? "+" : ""}{change24h.toFixed(2)}%
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>—</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const IND_LABELS: { key: keyof IndicatorConfig; label: string; color: string }[] = [
  { key: "volume", label: "Volume", color: "#26a69a" },
  { key: "ema9",   label: "EMA 9",  color: "#f59e0b" },
  { key: "ema20",  label: "EMA 20", color: "#a78bfa" },
  { key: "sma20",  label: "SMA 20", color: "#38bdf8" },
  { key: "bb",     label: "Bollinger Bands", color: "#94a3b8" },
  { key: "rsi",    label: "RSI (14)", color: "#3b82f6" },
  { key: "macd",   label: "MACD",   color: "#10b981" },
];

const DRAWING_TOOLS: { key: DrawingTool; label: string; icon: string; color: string; desc: string }[] = [
  { key: "hline",      label: "Horizontal Line", icon: "minus",     color: "#f59e0b", desc: "Click once to draw" },
  { key: "trendline",  label: "Trend Line",      icon: "trending-up", color: "#6366f1", desc: "Click 2 points"   },
  { key: "support",    label: "Support",         icon: "arrow-up",  color: "#00c896", desc: "Click once to draw" },
  { key: "resistance", label: "Resistance",      icon: "arrow-down", color: "#ff4d4d", desc: "Click once to draw" },
  { key: "fib",        label: "Fibonacci",       icon: "layers",    color: "#f59e0b", desc: "Click 2 points"     },
];

const CHART_TYPES: { key: "candle" | "line" | "area"; label: string; icon: string }[] = [
  { key: "candle", label: "Candles", icon: "bar-chart-2" },
  { key: "line",   label: "Line",    icon: "trending-up" },
  { key: "area",   label: "Area",    icon: "activity"    },
];

function IndicatorMenu({
  visible, onClose, indicators, onToggle, colors,
}: {
  visible: boolean; onClose: () => void;
  indicators: IndicatorConfig;
  onToggle: (key: keyof IndicatorConfig) => void;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[styles.panelMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Indicators</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {IND_LABELS.map(({ key, label, color }) => (
            <TouchableOpacity key={key} style={styles.indRow} onPress={() => onToggle(key)} activeOpacity={0.7}>
              <View style={styles.indLeft}>
                <View style={[styles.indDot, { backgroundColor: color }]} />
                <Text style={[styles.indLabel, { color: colors.foreground }]}>{label}</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: indicators[key] ? color : colors.muted }]}>
                <View style={[styles.toggleThumb, { transform: [{ translateX: indicators[key] ? 14 : 0 }] }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function DrawingToolsMenu({
  visible, onClose, activeTool, onSelectTool, onClear, colors,
}: {
  visible: boolean; onClose: () => void;
  activeTool: DrawingTool | null;
  onSelectTool: (t: DrawingTool | null) => void;
  onClear: () => void;
  colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[styles.panelMenu, { backgroundColor: colors.card, borderColor: colors.border, right: 14 }]}>
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>Drawing Tools</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {!isWeb && (
            <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={[styles.indLabel, { color: colors.mutedForeground, fontSize: 12 }]}>
                Drawing tools available on web only
              </Text>
            </View>
          )}
          {isWeb && DRAWING_TOOLS.map(({ key, label, icon, color, desc }) => {
            const active = activeTool === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.toolRow, active && { backgroundColor: color + "18" }]}
                onPress={() => { onSelectTool(active ? null : key); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.toolIconWrap, { backgroundColor: active ? color : colors.muted }]}>
                  <Feather name={icon as any} size={14} color={active ? "#fff" : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.indLabel, { color: active ? color : colors.foreground }]}>{label}</Text>
                  <Text style={[styles.toolDesc, { color: colors.mutedForeground }]}>{desc}</Text>
                </View>
                {active && <Feather name="check-circle" size={14} color={color} />}
              </TouchableOpacity>
            );
          })}
          {isWeb && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.indRow} onPress={() => { onClear(); onClose(); }} activeOpacity={0.7}>
                <View style={styles.indLeft}>
                  <Feather name="trash-2" size={14} color={colors.bear} />
                  <Text style={[styles.indLabel, { color: colors.bear }]}>Clear All Drawings</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const {
    candles, chartType, setChartType,
    selectedSymbol, setSelectedSymbol,
    symbolPrices, symbolChanges,
    currencyMode, usdToInr, theme, timeframe,
  } = useTradingContext();

  const [chartExpanded, setChartExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndMenu, setShowIndMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null);
  const [clearDrawingsKey, setClearDrawingsKey] = useState(0);
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    volume: true, ema9: false, ema20: false, sma20: false, bb: false, rsi: false, macd: false,
  });

  const anyIndicator = Object.entries(indicators).some(([k, v]) => k !== "volume" && v);
  const chartH = isFullscreen ? 0 : chartExpanded ? SH * 0.62 : SH * 0.36;

  const visibleSymbols = useMemo(() => {
    if (!searchQuery.trim()) return SYMBOLS;
    const q = searchQuery.toLowerCase();
    return SYMBOLS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  function toggleIndicator(key: keyof IndicatorConfig) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeInds = IND_LABELS.filter(({ key }) => key !== "volume" && indicators[key]);

  const chartProps = {
    key: `${selectedSymbol.id}-${timeframe}-${chartType}`,
    symbol: selectedSymbol.id,
    symbolType: selectedSymbol.type as "crypto",
    timeframe,
    isDark: theme === "dark",
    candles,
    chartType,
    bullColor: colors.bull,
    bearColor: colors.bear,
    textColor: colors.mutedForeground,
    gridColor: colors.border,
    bgColor: colors.chartBg,
    indicators,
    drawingTool,
    onDrawingComplete: () => setDrawingTool(null),
    clearDrawingsKey,
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ─── Sub-header: symbol + chart controls ─── */}
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SymbolSelector />
        <View style={styles.tools}>
          {/* Chart type: cycle candle → line → area */}
          {CHART_TYPES.map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.toolBtn,
                { backgroundColor: chartType === key ? colors.primary + "30" : colors.muted,
                  borderWidth: chartType === key ? 1 : 0,
                  borderColor: chartType === key ? colors.primary : "transparent" },
              ]}
              onPress={() => setChartType(key)}
            >
              <Feather name={icon as any} size={13} color={chartType === key ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          ))}

          {/* Indicators */}
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: anyIndicator ? colors.primary + "30" : colors.muted, borderWidth: anyIndicator ? 1 : 0, borderColor: anyIndicator ? colors.primary : "transparent" }]}
            onPress={() => setShowIndMenu(true)}
          >
            <Feather name="sliders" size={13} color={anyIndicator ? colors.primary : colors.foreground} />
          </TouchableOpacity>

          {/* Drawing tools */}
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: drawingTool ? "#f59e0b30" : colors.muted, borderWidth: drawingTool ? 1 : 0, borderColor: drawingTool ? "#f59e0b" : "transparent" }]}
            onPress={() => setShowToolsMenu(true)}
          >
            <Feather name="edit-2" size={13} color={drawingTool ? "#f59e0b" : colors.foreground} />
          </TouchableOpacity>

          {/* Fullscreen */}
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setIsFullscreen(true)}
          >
            <Feather name="maximize-2" size={13} color={colors.foreground} />
          </TouchableOpacity>

          {/* Expand/collapse */}
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setChartExpanded(!chartExpanded)}
          >
            <Feather name={chartExpanded ? "chevron-up" : "chevron-down"} size={13} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Price bar */}
      <PriceBar />

      {/* Active indicator chips */}
      {activeInds.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={[styles.chipsRow, { borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 10, gap: 6, alignItems: "center" }}
        >
          {activeInds.map(({ key, label, color }) => (
            <TouchableOpacity
              key={key} onPress={() => toggleIndicator(key)}
              style={[styles.chip, { backgroundColor: color + "20", borderColor: color + "60" }]}
            >
              <View style={[styles.chipDot, { backgroundColor: color }]} />
              <Text style={[styles.chipText, { color }]}>{label}</Text>
              <Feather name="x" size={10} color={color} />
            </TouchableOpacity>
          ))}
          {drawingTool && (
            <TouchableOpacity
              onPress={() => setDrawingTool(null)}
              style={[styles.chip, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b60" }]}
            >
              <Feather name="edit-2" size={10} color="#f59e0b" />
              <Text style={[styles.chipText, { color: "#f59e0b" }]}>
                {DRAWING_TOOLS.find(t => t.key === drawingTool)?.label}
              </Text>
              <Feather name="x" size={10} color="#f59e0b" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Timeframe */}
      <View style={[styles.tfRow, { borderBottomColor: colors.border }]}>
        <TimeframeSelector />
      </View>

      {/* Chart */}
      {!isFullscreen && (
        <View style={[styles.chartWrap, { height: chartH }]}>
          <LightweightChart {...chartProps} height={chartH} />
        </View>
      )}

      {/* Fullscreen chart */}
      {isFullscreen && (
        <LightweightChart
          {...chartProps}
          key={`fs-${selectedSymbol.id}-${timeframe}-${chartType}`}
          isFullscreen
          onFullscreenToggle={() => setIsFullscreen(false)}
        />
      )}

      {/* Watchlist */}
      {!isFullscreen && (
        <View style={[styles.watchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.watchHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.tabsWrap}>
              <View style={[styles.tab, { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Text style={[styles.tabText, { color: colors.primary }]}>Crypto</Text>
              </View>
            </View>
            <View style={styles.watchRight}>
              {showSearch ? (
                <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="search" size={12} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder="Search..."
                    placeholderTextColor={colors.mutedForeground}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => { setSearchQuery(""); setShowSearch(false); }}>
                    <Feather name="x" size={12} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.headerCol, { color: colors.mutedForeground }]}>Price</Text>
                  <Text style={[styles.headerCol, { color: colors.mutedForeground }]}>24h%</Text>
                  <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.searchBtn}>
                    <Feather name="search" size={13} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {visibleSymbols.length === 0 ? (
              <View style={styles.emptySearch}>
                <Feather name="search" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results for "{searchQuery}"</Text>
              </View>
            ) : (
              visibleSymbols.map((sym, idx) => (
                <WatchlistRow
                  key={sym.id}
                  symbol={sym}
                  isSelected={sym.id === selectedSymbol.id}
                  price={symbolPrices[sym.id] ?? 0}
                  change24h={symbolChanges[sym.id] ?? 0}
                  currencyMode={currencyMode}
                  usdToInr={usdToInr}
                  onPress={() => setSelectedSymbol(sym)}
                  colors={colors}
                  isLast={idx === visibleSymbols.length - 1}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      <IndicatorMenu
        visible={showIndMenu}
        onClose={() => setShowIndMenu(false)}
        indicators={indicators}
        onToggle={toggleIndicator}
        colors={colors}
      />

      <DrawingToolsMenu
        visible={showToolsMenu}
        onClose={() => setShowToolsMenu(false)}
        activeTool={drawingTool}
        onSelectTool={setDrawingTool}
        onClear={() => setClearDrawingsKey((k) => k + 1)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tools: { flexDirection: "row", gap: 4 },
  toolBtn: {
    width: 28, height: 28, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  chipsRow: { maxHeight: 36, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: "700" as const },
  tfRow: { paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth },
  chartWrap: { overflow: "hidden" },
  watchCard: {
    flex: 1, marginHorizontal: 10, marginTop: 8, marginBottom: 10,
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
  },
  watchHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 40,
  },
  tabsWrap: { flexDirection: "row", gap: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 10 },
  tabText: { fontSize: 13, fontWeight: "600" as const },
  watchRight: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  headerCol: { fontSize: 11, fontWeight: "500" as const, width: 72, textAlign: "right" },
  searchBtn: { padding: 4 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
  },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 2 },
  emptySearch: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  rowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  coinName: { fontSize: 13, fontWeight: "700" as const },
  coinSub: { fontSize: 11, marginTop: 1 },
  rowMid: { width: 90, alignItems: "flex-end" },
  priceText: { fontSize: 13, fontWeight: "600" as const },
  rowRight: { width: 72, alignItems: "flex-end" },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, minWidth: 60, alignItems: "center" },
  badgeText: { fontSize: 12, fontWeight: "700" as const },

  modalWrap: { flex: 1, backgroundColor: "#00000060" },
  panelMenu: {
    position: "absolute", top: 120, right: 14,
    width: 230, borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 12, zIndex: 100,
  },
  menuHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  menuTitle: { fontSize: 14, fontWeight: "700" as const },
  divider: { height: StyleSheet.hairlineWidth },
  indRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  indLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  indDot: { width: 8, height: 8, borderRadius: 4 },
  indLabel: { fontSize: 13, fontWeight: "600" as const },
  toggle: { width: 34, height: 20, borderRadius: 10, justifyContent: "center", paddingHorizontal: 2 },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },

  toolRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  toolIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  toolDesc: { fontSize: 10, marginTop: 1 },
});
