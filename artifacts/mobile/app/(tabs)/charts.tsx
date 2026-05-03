import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CoinLogo from "@/components/CoinLogo";
import TradingViewChart from "@/components/TradingViewChart";
import { SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

type SubTab = "traded" | "orderbook" | "trades";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtP(price: number, mode: "usd" | "inr", rate: number): string {
  if (!price) return "—";
  const v = mode === "inr" ? price * rate : price;
  if (v >= 100000) return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (v >= 1000)   return v.toFixed(2);
  if (v >= 1)      return v.toFixed(4);
  return v.toFixed(6);
}

function fmtRaw(price: number): string {
  if (!price) return "—";
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1)    return price.toFixed(4);
  return price.toFixed(6);
}

// lot sizes per ticker
const LOT_MAP: Record<string, number> = {
  BTC: 0.001, ETH: 0.01, BNB: 0.01, SOL: 0.1, ADA: 10, XRP: 10,
  DOGE: 100, MATIC: 10, SHIB: 100000, LTC: 0.1, LINK: 1, DOT: 1,
};

function getLotSize(ticker: string): number {
  return LOT_MAP[ticker] ?? 1;
}

// ── Order Book ────────────────────────────────────────────────────────────────

function OrderBook({ price, colors }: { price: number; colors: any }) {
  const levels = useMemo(() => {
    if (!price) return { asks: [], bids: [] };
    const step = price < 1 ? 0.0001 : price < 10 ? 0.001 : price < 100 ? 0.01 : price < 1000 ? 0.1 : 1;
    const asks = Array.from({ length: 10 }, (_, i) => ({
      price: price + step * (i + 1),
      qty: +(Math.random() * 5 + 0.1).toFixed(3),
      total: +(Math.random() * 50000 + 1000).toFixed(0),
    })).reverse();
    const bids = Array.from({ length: 10 }, (_, i) => ({
      price: price - step * (i + 1),
      qty: +(Math.random() * 5 + 0.1).toFixed(3),
      total: +(Math.random() * 50000 + 1000).toFixed(0),
    }));
    return { asks, bids };
  }, [Math.floor(price)]);

  const maxTotal = useMemo(
    () => Math.max(...levels.asks.map((a) => a.total), ...levels.bids.map((b) => b.total), 1),
    [levels]
  );

  const colHead = { color: colors.mutedForeground, fontSize: 11, fontWeight: "600" as const };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[ob.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 8 }]}>
        <Text style={[ob.col, colHead]}>Price (USDT)</Text>
        <Text style={[ob.col, { ...colHead, textAlign: "right" }]}>Qty</Text>
        <Text style={[ob.col, { ...colHead, textAlign: "right" }]}>Total</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Asks (red) */}
        {levels.asks.map((a, i) => (
          <View key={`a${i}`} style={ob.row}>
            <View style={[ob.bar, { backgroundColor: "#ef444418", width: `${(a.total / maxTotal) * 100}%` }]} />
            <Text style={[ob.col, { color: colors.bear, fontSize: 12 }]}>{fmtRaw(a.price)}</Text>
            <Text style={[ob.col, { color: colors.foreground, fontSize: 12, textAlign: "right" }]}>{a.qty}</Text>
            <Text style={[ob.col, { color: colors.mutedForeground, fontSize: 12, textAlign: "right" }]}>{a.total.toLocaleString()}</Text>
          </View>
        ))}

        {/* Mid price */}
        <View style={[ob.midRow, { backgroundColor: colors.muted }]}>
          <Text style={{ color: price > 0 ? colors.bull : colors.bear, fontSize: 15, fontWeight: "700" as const }}>
            {fmtRaw(price)}
          </Text>
          <SvgIcon name="arrow-down-outline" size={14} color={colors.bear} />
        </View>

        {/* Bids (green) */}
        {levels.bids.map((b, i) => (
          <View key={`b${i}`} style={ob.row}>
            <View style={[ob.bar, { backgroundColor: "#10b98118", width: `${(b.total / maxTotal) * 100}%` }]} />
            <Text style={[ob.col, { color: colors.bull, fontSize: 12 }]}>{fmtRaw(b.price)}</Text>
            <Text style={[ob.col, { color: colors.foreground, fontSize: 12, textAlign: "right" }]}>{b.qty}</Text>
            <Text style={[ob.col, { color: colors.mutedForeground, fontSize: 12, textAlign: "right" }]}>{b.total.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const ob = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 5, position: "relative",
  },
  col: { flex: 1, fontSize: 12 },
  bar: {
    position: "absolute", top: 0, right: 0, bottom: 0,
    opacity: 0.6,
  },
  midRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
  },
});

// ── Recent Trades ─────────────────────────────────────────────────────────────

type RecentTrade = { price: number; qty: number; time: string; side: "buy" | "sell" };

function RecentTrades({ price, colors }: { price: number; colors: any }) {
  const trades = useMemo<RecentTrade[]>(() => {
    if (!price) return [];
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => {
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const offset = (Math.random() - 0.5) * price * 0.002;
      const d = new Date(now - i * 3000);
      return {
        price: price + offset,
        qty: +(Math.random() * 3 + 0.001).toFixed(4),
        time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
        side,
      };
    });
  }, [Math.floor(price / 10)]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <Text style={[{ flex: 1, color: colors.mutedForeground, fontSize: 11, fontWeight: "600" as const }]}>Price (USDT)</Text>
        <Text style={[{ flex: 1, color: colors.mutedForeground, fontSize: 11, fontWeight: "600" as const, textAlign: "right" }]}>Qty</Text>
        <Text style={[{ flex: 1, color: colors.mutedForeground, fontSize: 11, fontWeight: "600" as const, textAlign: "right" }]}>Time</Text>
      </View>
      <FlatList
        data={trades}
        keyExtractor={(_, i) => String(i)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ flex: 1, color: item.side === "buy" ? colors.bull : colors.bear, fontSize: 12 }}>
              {fmtRaw(item.price)}
            </Text>
            <Text style={{ flex: 1, color: colors.foreground, fontSize: 12, textAlign: "right" }}>{item.qty}</Text>
            <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 12, textAlign: "right" }}>{item.time}</Text>
          </View>
        )}
      />
    </View>
  );
}

// ── Quick Trade Modal ─────────────────────────────────────────────────────────

function QuickTradeModal({
  visible, side, price, ticker, lotSize,
  colors, onClose, onConfirm,
}: {
  visible: boolean;
  side: "buy" | "sell";
  price: number;
  ticker: string;
  lotSize: number;
  colors: any;
  onClose: () => void;
  onConfirm: (qty: number) => void;
}) {
  const [lots, setLots] = useState(1);
  const qty = +(lots * lotSize).toFixed(8);
  const isLong = side === "buy";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[qt.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={onClose} />
      <View style={[qt.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={qt.handle} />
        <Text style={[qt.title, { color: colors.foreground }]}>
          {isLong ? "Open Long" : "Open Short"} — {ticker}/USDT
        </Text>
        <Text style={[qt.subtitle, { color: colors.mutedForeground }]}>
          Market price: {fmtRaw(price)}
        </Text>

        {/* Lot size stepper */}
        <View style={[qt.lotRow, { backgroundColor: colors.muted, borderRadius: 12 }]}>
          <TouchableOpacity onPress={() => setLots((l) => Math.max(1, l - 1))} style={qt.stepBtn}>
            <SvgIcon name="remove-outline" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[qt.lotsNum, { color: colors.foreground }]}>{lots}</Text>
            <Text style={[qt.lotsLabel, { color: colors.mutedForeground }]}>
              {qty} {ticker} = {lots} Lot{lots > 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setLots((l) => l + 1)} style={qt.stepBtn}>
            <SvgIcon name="add-outline" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Quick lot presets */}
        <View style={qt.presets}>
          {[1, 2, 5, 10].map((n) => (
            <TouchableOpacity
              key={n}
              onPress={() => setLots(n)}
              style={[qt.preset, { backgroundColor: lots === n ? (isLong ? colors.bull : colors.bear) : colors.muted }]}
            >
              <Text style={[qt.presetText, { color: lots === n ? "#fff" : colors.mutedForeground }]}>{n}x</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => { onConfirm(qty); onClose(); }}
          style={[qt.confirmBtn, { backgroundColor: isLong ? colors.bull : colors.bear }]}
          activeOpacity={0.85}
        >
          <Text style={qt.confirmText}>{isLong ? "Open Long" : "Open Short"} {fmtRaw(price)}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const qt = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, paddingHorizontal: 20, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#555", alignSelf: "center", marginTop: 10, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "700" as const, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20 },
  lotRow: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 16 },
  stepBtn: { padding: 10 },
  lotsNum: { fontSize: 24, fontWeight: "700" as const },
  lotsLabel: { fontSize: 12, marginTop: 2 },
  presets: { flexDirection: "row", gap: 10, marginBottom: 20 },
  preset: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  presetText: { fontSize: 13, fontWeight: "700" as const },
  confirmBtn: { paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
});

// ── Desktop Crypto Panel (web only) ──────────────────────────────────────────

function DesktopCryptoPanel({
  colors, symbolPrices, symbolChanges, selectedId,
  currencyMode, usdToInr, onSelect,
}: {
  colors: any; symbolPrices: Record<string, number>;
  symbolChanges: Record<string, number>; selectedId: string;
  currencyMode: "usd" | "inr"; usdToInr: number;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={[dp.panel, { backgroundColor: colors.surface, borderLeftColor: colors.border }]}>
      {/* Header */}
      <View style={[dp.header, { borderBottomColor: colors.border }]}>
        <Text style={[dp.title, { color: colors.foreground }]}>Crypto</Text>
        <Text style={[dp.count, { color: colors.mutedForeground }]}>{filtered.length} coins</Text>
      </View>

      {/* Search */}
      <View style={[dp.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <SvgIcon name="search-outline" size={13} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search…"
          placeholderTextColor={colors.mutedForeground}
          style={[dp.searchInput, { color: colors.foreground }]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <SvgIcon name="close-circle-outline" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Column headers */}
      <View style={[dp.colHead, { borderBottomColor: colors.border }]}>
        <Text style={[dp.colLabel, { color: colors.mutedForeground, flex: 1 }]}>Name</Text>
        <Text style={[dp.colLabel, { color: colors.mutedForeground, width: 72, textAlign: "right" }]}>Price</Text>
        <Text style={[dp.colLabel, { color: colors.mutedForeground, width: 52, textAlign: "right" }]}>24h %</Text>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {filtered.map((item) => {
          const p   = symbolPrices[item.id] ?? 0;
          const c   = symbolChanges[item.id] ?? 0;
          const pos = c >= 0;
          const ticker = item.label.replace("/USDT", "");
          const isSelected = item.id === selectedId;
          const priceStr = (() => {
            if (!p) return "—";
            if (currencyMode === "inr") {
              const inr = p * usdToInr;
              if (inr >= 100000) return `₹${(inr / 100000).toFixed(2)}L`;
              if (inr >= 1000)   return `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
              if (inr >= 1)      return `₹${inr.toFixed(2)}`;
              return `₹${inr.toFixed(4)}`;
            }
            if (p >= 10000)  return `$${(p / 1000).toFixed(1)}k`;
            if (p >= 1000)   return `$${p.toFixed(0)}`;
            if (p >= 1)      return `$${p.toFixed(2)}`;
            return `$${p.toFixed(4)}`;
          })();

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
              style={[
                dp.row,
                { borderBottomColor: colors.border },
                isSelected && { backgroundColor: colors.accent },
              ]}
            >
              <CoinLogo symbolId={item.id} size={26} />
              <View style={{ flex: 1, marginLeft: 7 }}>
                <Text style={[dp.rowTicker, { color: colors.foreground }]} numberOfLines={1}>{ticker}</Text>
                <Text style={[dp.rowName, { color: colors.mutedForeground }]} numberOfLines={1}>{item.name}</Text>
              </View>
              <View style={{ width: 72, alignItems: "flex-end" }}>
                <Text style={[dp.rowPrice, { color: colors.foreground }]} numberOfLines={1}>{priceStr}</Text>
              </View>
              <View style={[dp.chgBadge, { backgroundColor: pos ? "#16a34a20" : "#dc262620", width: 52 }]}>
                <Text style={[dp.rowChg, { color: pos ? colors.bull : colors.bear }]}>
                  {pos ? "+" : ""}{c.toFixed(2)}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const dp = StyleSheet.create({
  panel: {
    width: 260,
    borderLeftWidth: StyleSheet.hairlineWidth,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 14, fontWeight: "700" as const, letterSpacing: 0.2 },
  count: { fontSize: 11 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 12, padding: 0 },
  colHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colLabel: { fontSize: 10, fontWeight: "600" as const },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTicker: { fontSize: 12, fontWeight: "700" as const },
  rowName: { fontSize: 10, marginTop: 1 },
  rowPrice: { fontSize: 11, fontWeight: "600" as const },
  chgBadge: { alignItems: "center", justifyContent: "center", paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  rowChg: { fontSize: 10, fontWeight: "700" as const },
});

// ── Symbol Picker Modal ───────────────────────────────────────────────────────

function SymbolPickerModal({
  visible, colors, symbolPrices, symbolChanges, selectedId,
  currencyMode, usdToInr, onSelect, onClose,
}: {
  visible: boolean; colors: any; symbolPrices: Record<string, number>;
  symbolChanges: Record<string, number>; selectedId: string;
  currencyMode: "usd" | "inr"; usdToInr: number;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[qt.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={onClose} />
      <View style={[sp.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={qt.handle} />
        <Text style={[qt.title, { color: colors.foreground }]}>Select Coin</Text>
        <FlatList
          data={SYMBOLS}
          keyExtractor={(s) => s.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const p = symbolPrices[item.id] ?? 0;
            const c = symbolChanges[item.id] ?? 0;
            const pos = c >= 0;
            const ticker = item.label.replace("/USDT", "");
            return (
              <TouchableOpacity
                onPress={() => { onSelect(item.id); onClose(); }}
                style={[sp.row, { borderBottomColor: colors.border, backgroundColor: item.id === selectedId ? colors.accent : "transparent" }]}
              >
                <CoinLogo symbolId={item.id} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[sp.label, { color: colors.foreground }]}>{ticker}</Text>
                  <Text style={[sp.sub, { color: colors.mutedForeground }]}>{item.name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[sp.price, { color: colors.foreground }]}>{fmtP(p, currencyMode, usdToInr)}</Text>
                  <Text style={[sp.chg, { color: pos ? colors.bull : colors.bear }]}>{pos ? "+" : ""}{c.toFixed(2)}%</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const sp = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, paddingHorizontal: 0, paddingBottom: 36,
    maxHeight: "82%",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 14, fontWeight: "600" as const },
  sub: { fontSize: 11, marginTop: 1 },
  price: { fontSize: 13, fontWeight: "600" as const },
  chg: { fontSize: 11, marginTop: 1 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ChartsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    selectedSymbol, setSelectedSymbol,
    currentPrice, priceChange24h,
    currencyMode, usdToInr,
    openPosition,
    symbolPrices, symbolChanges,
  } = useTradingContext();

  const [subTab,          setSubTab]          = useState<SubTab>("traded");
  const [chartHeight,     setChartHeight]     = useState(300);
  const [quickVisible,    setQuickVisible]    = useState(false);
  const [quickSide,       setQuickSide]       = useState<"buy" | "sell">("buy");
  const [symbolPickerVis, setSymbolPickerVis] = useState(false);

  const isPositive = priceChange24h >= 0;
  const priceColor = isPositive ? colors.bull : colors.bear;
  const currSym    = currencyMode === "inr" ? "₹" : "$";
  const ticker     = selectedSymbol.label.replace("/USDT", "").replace("/", "");
  const lotSize    = getLotSize(ticker);

  const chartContainerRef = useRef<View>(null);

  const onChartLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 50) setChartHeight(h);
  }, []);

  // Web: update chartHeight on window resize so chart fills container
  useEffect(() => {
    if (Platform.OS !== "web") return;
    function handleResize() {
      if (chartContainerRef.current) {
        (chartContainerRef.current as any).measure(
          (_x: number, _y: number, _w: number, h: number) => {
            if (h > 50) setChartHeight(h);
          }
        );
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleShort() {
    setQuickSide("sell");
    setQuickVisible(true);
    Haptics.selectionAsync();
  }

  function handleLong() {
    setQuickSide("buy");
    setQuickVisible(true);
    Haptics.selectionAsync();
  }

  function handleConfirm(qty: number) {
    const result = openPosition({ side: quickSide, quantity: qty });
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Order Failed", result.message);
    }
  }

  function handleSelectSymbol(id: string) {
    const sym = SYMBOLS.find((s) => s.id === id);
    if (sym) setSelectedSymbol(sym);
  }

  const subTabs: { key: SubTab; label: string }[] = [
    { key: "traded",    label: "Traded Price" },
    { key: "orderbook", label: "Order Book"   },
    { key: "trades",    label: "Recent Trades" },
  ];

  const { width: winW } = useWindowDimensions();
  const tabBarH      = Platform.OS === "web" ? 64 : 50 + insets.bottom;
  // Only show desktop side-panel when screen is genuinely wide (tablet/desktop)
  const isDesktopWeb = Platform.OS === "web" && winW >= 768;

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingBottom: tabBarH }]}>

      {/* ── Coin Header (full width) ── */}
      <View style={[s.coinHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.coinLeft} onPress={() => setSymbolPickerVis(true)} activeOpacity={0.75}>
          <CoinLogo symbolId={selectedSymbol.id} size={28} />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[s.symbolName, { color: colors.foreground }]}>
                {ticker}USDT
              </Text>
              <SvgIcon name="chevron-down-outline" size={13} color={colors.mutedForeground} />
            </View>
            <Text style={[s.symbolSub, { color: colors.mutedForeground }]}>
              {selectedSymbol.name} Perpetual
            </Text>
          </View>
        </TouchableOpacity>

        <View style={s.coinRight}>
          <Text style={[s.coinPrice, { color: priceColor }]}>
            {currSym}{fmtP(currentPrice, currencyMode, usdToInr)}
          </Text>
          <View style={[s.changeBadge, { backgroundColor: isPositive ? colors.bullBg : colors.bearBg }]}>
            <Text style={[s.changeText, { color: priceColor }]}>
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </Text>
          </View>
        </View>

      </View>

      {/* ── Sub-tabs (full width) ── */}
      <View style={[s.subNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subNavInner}>
          {subTabs.map(({ key, label }) => {
            const active = subTab === key;
            return (
              <TouchableOpacity key={key} onPress={() => setSubTab(key)} style={s.subNavItem} activeOpacity={0.7}>
                <Text style={[s.subNavText, { color: active ? colors.primary : colors.mutedForeground }]}>
                  {label}
                </Text>
                {active && <View style={[s.subNavUnderline, { backgroundColor: colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Middle Row: Chart + Desktop Crypto Panel ── */}
      <View style={{ flex: 1, flexDirection: "row" }}>

        {/* Chart / order book / trades — takes all remaining width */}
        <View style={{ flex: 1 }} onLayout={onChartLayout}>
          <View style={subTab === "traded" ? { flex: 1 } : { height: 0, overflow: "hidden" as const }}>
            <TradingViewChart symbol={selectedSymbol.id} height={chartHeight} />
          </View>
          {subTab === "orderbook" && (
            <OrderBook price={currentPrice} colors={colors} />
          )}
          {subTab === "trades" && (
            <RecentTrades price={currentPrice} colors={colors} />
          )}
        </View>

        {/* Desktop-only crypto panel (right side, 768px+) */}
        {isDesktopWeb && (
          <DesktopCryptoPanel
            colors={colors}
            symbolPrices={symbolPrices}
            symbolChanges={symbolChanges}
            selectedId={selectedSymbol.id}
            currencyMode={currencyMode}
            usdToInr={usdToInr}
            onSelect={handleSelectSymbol}
          />
        )}
      </View>

      {/* ── Bottom Quick Trade Bar (full width) ── */}
      <View style={[s.tradeBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleShort} style={[s.tradeBtn, s.shortBtn]} activeOpacity={0.82}>
          <Text style={s.tradeBtnTop}>Short</Text>
          <Text style={s.tradeBtnPrice} numberOfLines={1}>
            {fmtP(currentPrice, currencyMode, usdToInr)}
          </Text>
        </TouchableOpacity>

        <View style={[s.lotBox, { borderColor: colors.border }]}>
          <Text style={[s.lotTop, { color: colors.mutedForeground }]} numberOfLines={1}>
            1 Lot = {lotSize} {ticker}
          </Text>
          <TouchableOpacity
            onPress={() => setSymbolPickerVis(true)}
            style={[s.lotTicker, { backgroundColor: colors.muted, borderRadius: 6 }]}
          >
            <Text style={[s.lotTickerText, { color: colors.foreground }]}>{ticker}</Text>
            <SvgIcon name="chevron-down-outline" size={11} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLong} style={[s.tradeBtn, s.longBtn]} activeOpacity={0.82}>
          <Text style={s.tradeBtnTop}>Long</Text>
          <Text style={s.tradeBtnPrice} numberOfLines={1}>
            {fmtP(currentPrice, currencyMode, usdToInr)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modals ── */}
      <QuickTradeModal
        visible={quickVisible}
        side={quickSide}
        price={currentPrice}
        ticker={ticker}
        lotSize={lotSize}
        colors={colors}
        onClose={() => setQuickVisible(false)}
        onConfirm={handleConfirm}
      />

      <SymbolPickerModal
        visible={symbolPickerVis}
        colors={colors}
        symbolPrices={symbolPrices}
        symbolChanges={symbolChanges}
        selectedId={selectedSymbol.id}
        currencyMode={currencyMode}
        usdToInr={usdToInr}
        onSelect={handleSelectSymbol}
        onClose={() => setSymbolPickerVis(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Coin header
  coinHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  coinLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  symbolName: { fontSize: 15, fontWeight: "700" as const, letterSpacing: 0.2 },
  symbolSub: { fontSize: 10, marginTop: 1 },
  coinRight: { alignItems: "flex-end", gap: 3 },
  coinPrice: { fontSize: 16, fontWeight: "700" as const, letterSpacing: -0.3 },
  changeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  changeText: { fontSize: 11, fontWeight: "700" as const },
  gearBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

  // Sub-nav
  subNav: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 40,
  },
  subNavInner: { paddingHorizontal: 4 },
  subNavItem: { paddingHorizontal: 14, paddingVertical: 10, position: "relative", alignItems: "center" },
  subNavText: { fontSize: 13, fontWeight: "600" as const },
  subNavUnderline: { position: "absolute", bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  navGear: { marginRight: 10, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  // Bottom trade bar
  tradeBar: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8, paddingVertical: 8, gap: 6,
  },
  tradeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  shortBtn: { backgroundColor: "#ef4444" },
  longBtn:  { backgroundColor: "#22c55e" },
  tradeBtnTop:   { color: "#fff", fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.3 },
  tradeBtnPrice: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" as const, marginTop: 2 },

  lotBox: {
    flex: 1.2, alignItems: "center", justifyContent: "center",
    borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6, gap: 4,
  },
  lotTop: { fontSize: 10, fontWeight: "500" as const },
  lotTicker: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3 },
  lotTickerText: { fontSize: 12, fontWeight: "700" as const },
});
