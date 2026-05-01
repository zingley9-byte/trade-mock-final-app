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
import LightweightChart, { IndicatorConfig } from "@/components/LightweightChart";
import SymbolSelector from "@/components/SymbolSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import PriceBar from "@/components/PriceBar";
import { MarketSymbol, SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { width: SW, height: SH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

const COIN_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A", ETHUSDT: "#627EEA", BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633", SOLUSDT: "#9945FF", NIFTY50: "#1a7ef7",
  SENSEX: "#e84040", BANKNIFTY: "#16a34a", BANKEX: "#7c3aed",
};

function fmtPrice(price: number, symbol: MarketSymbol, mode: "usd" | "inr"): string {
  const sym = symbol.type === "indian" ? "₹" : mode === "usd" ? "$" : "₹";
  if (!price) return `${sym}—`;
  if (price >= 10000) return `${sym}${price.toLocaleString(mode === "usd" ? "en-US" : "en-IN", { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `${sym}${price.toFixed(2)}`;
  return `${sym}${price.toFixed(4)}`;
}

function WatchlistRow({
  symbol, isSelected, price, change24h, currencyMode, onPress, colors, isLast,
}: {
  symbol: MarketSymbol; isSelected: boolean; price: number;
  change24h: number; currencyMode: "usd" | "inr";
  onPress: () => void; colors: any; isLast: boolean;
}) {
  const coinColor = COIN_COLORS[symbol.id] ?? colors.primary;
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
        <View style={[styles.coinDot, { backgroundColor: coinColor }]}>
          <Text style={styles.coinDotText}>{ticker.charAt(0)}</Text>
        </View>
        <View>
          <Text style={[styles.coinName, { color: colors.foreground }]}>{ticker}</Text>
          <Text style={[styles.coinSub, { color: colors.mutedForeground }]}>{symbol.name}</Text>
        </View>
      </View>
      <View style={styles.rowMid}>
        <Text style={[styles.priceText, { color: colors.foreground }]}>{fmtPrice(price, symbol, currencyMode)}</Text>
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
  { key: "ema9", label: "EMA9", color: "#f59e0b" },
  { key: "ema20", label: "EMA20", color: "#a78bfa" },
  { key: "rsi", label: "RSI", color: "#3b82f6" },
  { key: "macd", label: "MACD", color: "#10b981" },
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
        <View style={[styles.indMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.indMenuHeader}>
          <Text style={[styles.indMenuTitle, { color: colors.foreground }]}>Indicators</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {IND_LABELS.map(({ key, label, color }) => (
          <TouchableOpacity
            key={key}
            style={styles.indRow}
            onPress={() => onToggle(key)}
            activeOpacity={0.7}
          >
            <View style={styles.indLeft}>
              <View style={[styles.indDot, { backgroundColor: color }]} />
              <Text style={[styles.indLabel, { color: colors.foreground }]}>{label}</Text>
            </View>
            <View style={[
              styles.toggle,
              { backgroundColor: indicators[key] ? color : colors.muted }
            ]}>
              <View style={[styles.toggleThumb, { transform: [{ translateX: indicators[key] ? 14 : 0 }] }]} />
            </View>
          </TouchableOpacity>
        ))}
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const {
    candles, chartType, setChartType,
    marketFilter, setMarketFilter,
    selectedSymbol, setSelectedSymbol,
    symbolPrices, symbolChanges,
    currencyMode, theme, timeframe,
  } = useTradingContext();

  const [chartExpanded, setChartExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndMenu, setShowIndMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    ema9: false, ema20: false, rsi: false, macd: false,
  });

  const anyIndicator = Object.values(indicators).some(Boolean);
  const chartH = isFullscreen ? 0 : chartExpanded ? SH * 0.62 : SH * 0.36;

  const visibleSymbols = useMemo(() => {
    const base = SYMBOLS.filter((s) => s.type === marketFilter);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [marketFilter, searchQuery]);

  function toggleIndicator(key: keyof IndicatorConfig) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const activeInds = IND_LABELS.filter(({ key }) => indicators[key]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sub-header: symbol selector + tools */}
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SymbolSelector />
        <View style={styles.tools}>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setChartType(chartType === "candle" ? "line" : "candle")}
          >
            <Feather name={chartType === "candle" ? "trending-up" : "bar-chart-2"} size={14} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: anyIndicator ? colors.primary + "30" : colors.muted, borderWidth: anyIndicator ? 1 : 0, borderColor: anyIndicator ? colors.primary : "transparent" }]}
            onPress={() => setShowIndMenu(true)}
          >
            <Feather name="activity" size={14} color={anyIndicator ? colors.primary : colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setIsFullscreen(true)}
          >
            <Feather name="maximize-2" size={14} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setChartExpanded(!chartExpanded)}
          >
            <Feather name={chartExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Price bar */}
      <PriceBar />

      {/* Active indicators chips */}
      {activeInds.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsRow, { borderBottomColor: colors.border }]} contentContainerStyle={{ paddingHorizontal: 10, gap: 6, alignItems: "center" }}>
          {activeInds.map(({ key, label, color }) => (
            <TouchableOpacity
              key={key}
              onPress={() => toggleIndicator(key)}
              style={[styles.chip, { backgroundColor: color + "20", borderColor: color + "60" }]}
            >
              <View style={[styles.chipDot, { backgroundColor: color }]} />
              <Text style={[styles.chipText, { color }]}>{label}</Text>
              <Feather name="x" size={10} color={color} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Timeframe */}
      <View style={[styles.tfRow, { borderBottomColor: colors.border }]}>
        <TimeframeSelector />
      </View>

      {/* Chart */}
      {!isFullscreen && (
        <View style={[styles.chartWrap, { height: chartH }]}>
          <LightweightChart
            key={`${selectedSymbol.id}-${timeframe}-${chartType}`}
            symbol={selectedSymbol.id}
            symbolType={selectedSymbol.type}
            timeframe={timeframe}
            isDark={theme === "dark"}
            height={chartH}
            candles={candles}
            chartType={chartType}
            bullColor={colors.bull}
            bearColor={colors.bear}
            textColor={colors.mutedForeground}
            gridColor={colors.border}
            bgColor={colors.chartBg}
            showVolume
            indicators={indicators}
          />
        </View>
      )}

      {/* Fullscreen chart (web uses CSS fixed; native uses Modal inside LightweightChart) */}
      {isFullscreen && (
        <LightweightChart
          key={`fs-${selectedSymbol.id}-${timeframe}-${chartType}`}
          symbol={selectedSymbol.id}
          symbolType={selectedSymbol.type}
          timeframe={timeframe}
          isDark={theme === "dark"}
          candles={candles}
          chartType={chartType}
          bullColor={colors.bull}
          bearColor={colors.bear}
          textColor={colors.mutedForeground}
          gridColor={colors.border}
          bgColor={colors.chartBg}
          showVolume
          indicators={indicators}
          isFullscreen
          onFullscreenToggle={() => setIsFullscreen(false)}
        />
      )}

      {/* Watchlist */}
      {!isFullscreen && (
        <View style={[styles.watchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.watchHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.tabsWrap}>
              {(["crypto", "indian"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setMarketFilter(t); setSearchQuery(""); }}
                  style={[styles.tab, marketFilter === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                  <Text style={[styles.tabText, { color: marketFilter === t ? colors.primary : colors.mutedForeground }]}>
                    {t === "crypto" ? "Crypto" : "Indian"}
                  </Text>
                </TouchableOpacity>
              ))}
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
                  onPress={() => setSelectedSymbol(sym)}
                  colors={colors}
                  isLast={idx === visibleSymbols.length - 1}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Indicator menu */}
      <IndicatorMenu
        visible={showIndMenu}
        onClose={() => setShowIndMenu(false)}
        indicators={indicators}
        onToggle={toggleIndicator}
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
  tools: { flexDirection: "row", gap: 5 },
  toolBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  chipsRow: { maxHeight: 36, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 10, fontWeight: "700" },
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
  tabText: { fontSize: 13, fontWeight: "600" },
  watchRight: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  headerCol: { fontSize: 11, fontWeight: "500", width: 72, textAlign: "right" },
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
  coinDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  coinDotText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  coinName: { fontSize: 13, fontWeight: "700" },
  coinSub: { fontSize: 11, marginTop: 1 },
  rowMid: { width: 90, alignItems: "flex-end" },
  priceText: { fontSize: 13, fontWeight: "600" },
  rowRight: { width: 72, alignItems: "flex-end" },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, minWidth: 60, alignItems: "center" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  // Indicator menu
  modalWrap: { flex: 1, backgroundColor: "#00000060" },
  indMenu: {
    position: "absolute", top: 120, right: 14,
    width: 210, borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 12, zIndex: 100,
  },
  indMenuHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  indMenuTitle: { fontSize: 14, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth },
  indRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 13,
  },
  indLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  indDot: { width: 8, height: 8, borderRadius: 4 },
  indLabel: { fontSize: 13, fontWeight: "600" },
  toggle: {
    width: 34, height: 20, borderRadius: 10, justifyContent: "center", paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff",
  },
});
