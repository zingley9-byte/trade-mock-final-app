import React, { useState, useMemo, useCallback } from "react";
import {
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import TradingViewChart from "@/components/TradingViewChart";
import SymbolSelector from "@/components/SymbolSelector";
import PriceBar from "@/components/PriceBar";
import CoinLogo from "@/components/CoinLogo";
import { MarketSymbol, SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { height: SH } = Dimensions.get("window");

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

export default function HomeScreen() {
  const colors = useColors();
  const {
    selectedSymbol, setSelectedSymbol,
    symbolPrices, symbolChanges,
    currencyMode, usdToInr,
    refreshPrices,
  } = useTradingContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (Platform.OS === "web") {
        window.location.reload();
      } else {
        await refreshPrices();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrices]);

  const { width: winW } = useWindowDimensions();
  // Mobile web (<768px) gets native-sized chart so watchlist stays visible
  const isDesktopWeb = Platform.OS === "web" && winW >= 768;
  const chartH = isDesktopWeb ? Math.round(SH * 0.60) : Math.round(SH * 0.38);

  const visibleSymbols = useMemo(() => {
    if (!searchQuery.trim()) return SYMBOLS;
    const q = searchQuery.toLowerCase();
    return SYMBOLS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* Symbol selector row */}
      <View style={[styles.symRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SymbolSelector />
      </View>

      {/* Price bar */}
      <PriceBar />

      {/* TradingView-style chart — constrain height so watchlist stays visible */}
      <View style={{ height: chartH }}>
        <TradingViewChart
          symbol={selectedSymbol.id}
          height={chartH}
        />
      </View>

      {/* Watchlist */}
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
                <SvgIcon name="search-outline" size={12} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search..."
                  placeholderTextColor={colors.mutedForeground}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                <TouchableOpacity onPress={() => { setSearchQuery(""); setShowSearch(false); }}>
                  <SvgIcon name="close-outline" size={12} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.headerCol, { color: colors.mutedForeground }]}>Price</Text>
                <Text style={[styles.headerCol, { color: colors.mutedForeground }]}>24h%</Text>
                <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.searchBtn}>
                  <SvgIcon name="search-outline" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {visibleSymbols.length === 0 ? (
            <View style={styles.emptySearch}>
              <SvgIcon name="search-outline" size={24} color={colors.mutedForeground} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  symRow: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
});
