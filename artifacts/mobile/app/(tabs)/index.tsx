import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CandlestickChart from "@/components/CandlestickChart";
import SymbolSelector from "@/components/SymbolSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import PriceBar from "@/components/PriceBar";
import {
  MarketSymbol,
  SYMBOLS,
  useTradingContext,
} from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COIN_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A",
  ETHUSDT: "#627EEA",
  BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633",
  SOLUSDT: "#9945FF",
  NIFTY50: "#1a7ef7",
  SENSEX: "#e84040",
  BANKNIFTY: "#16a34a",
  BANKEX: "#7c3aed",
};

function formatPrice(price: number, symbol: MarketSymbol, currencyMode: "usd" | "inr"): string {
  const sym = symbol.type === "indian" ? "₹" : (currencyMode === "usd" ? "$" : "₹");
  if (price === 0) return `${sym}—`;
  if (price >= 10000) return `${sym}${price.toLocaleString(currencyMode === "usd" ? "en-US" : "en-IN", { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `${sym}${price.toFixed(2)}`;
  return `${sym}${price.toFixed(4)}`;
}

function WatchlistRow({
  symbol,
  isSelected,
  price,
  change24h,
  currencyMode,
  onPress,
  colors,
  isLast,
}: {
  symbol: MarketSymbol;
  isSelected: boolean;
  price: number;
  change24h: number;
  currencyMode: "usd" | "inr";
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isLast: boolean;
}) {
  const coinColor = COIN_COLORS[symbol.id] ?? colors.primary;
  const ticker = symbol.label.replace("/USDT", "");
  const isPositive = change24h >= 0;
  const priceStr = formatPrice(price, symbol, currencyMode);

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
          <Text style={[styles.coinSubname, { color: colors.mutedForeground }]}>{symbol.name}</Text>
        </View>
      </View>

      <View style={styles.rowMid}>
        <Text style={[styles.priceText, { color: colors.foreground }]}>{priceStr}</Text>
      </View>

      <View style={styles.rowRight}>
        {change24h !== 0 ? (
          <View style={[styles.changeBadge, { backgroundColor: isPositive ? colors.bullBg : colors.bearBg }]}>
            <Text style={[styles.changeText, { color: isPositive ? colors.bull : colors.bear }]}>
              {isPositive ? "+" : ""}{change24h.toFixed(2)}%
            </Text>
          </View>
        ) : (
          <View style={[styles.changeBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.changeText, { color: colors.mutedForeground }]}>—</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const {
    candles,
    chartType,
    setChartType,
    marketFilter,
    setMarketFilter,
    selectedSymbol,
    setSelectedSymbol,
    symbolPrices,
    symbolChanges,
    currencyMode,
  } = useTradingContext();
  const [chartExpanded, setChartExpanded] = useState(false);
  const chartH = chartExpanded ? SCREEN_HEIGHT * 0.65 : SCREEN_HEIGHT * 0.38;

  const visibleSymbols = SYMBOLS.filter((s) => s.type === marketFilter);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <SymbolSelector />
        <View style={styles.tools}>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setChartType(chartType === "candle" ? "line" : "candle")}
          >
            <Feather
              name={chartType === "candle" ? "trending-up" : "bar-chart-2"}
              size={15}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted }]}
            onPress={() => setChartExpanded(!chartExpanded)}
          >
            <Feather
              name={chartExpanded ? "minimize-2" : "maximize-2"}
              size={15}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <PriceBar />

      <View style={[styles.tfRow, { borderBottomColor: colors.border }]}>
        <TimeframeSelector />
      </View>

      <View style={[styles.chartWrap, { height: chartH, backgroundColor: colors.chartBg }]}>
        <CandlestickChart
          candles={candles}
          width={SCREEN_WIDTH}
          height={chartH}
          chartType={chartType}
          bullColor={colors.bull}
          bearColor={colors.bear}
          textColor={colors.mutedForeground}
          gridColor={colors.border}
          bgColor={colors.chartBg}
        />
      </View>

      <View style={[styles.watchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setMarketFilter("crypto")}
            style={[styles.tab, marketFilter === "crypto" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: marketFilter === "crypto" ? colors.primary : colors.mutedForeground }]}>
              Crypto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMarketFilter("indian")}
            style={[styles.tab, marketFilter === "indian" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: marketFilter === "indian" ? colors.primary : colors.mutedForeground }]}>
              Indian
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCol, { color: colors.mutedForeground, width: 90, textAlign: "right" }]}>Last Price</Text>
            <Text style={[styles.headerCol, { color: colors.mutedForeground, width: 72, textAlign: "right" }]}>24h chg%</Text>
          </View>
        </View>

        {visibleSymbols.map((sym, idx) => (
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
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tools: { flexDirection: "row", gap: 6 },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tfRow: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chartWrap: { overflow: "hidden" },
  watchCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerCol: {
    fontSize: 11,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coinDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  coinDotText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  coinName: {
    fontSize: 13,
    fontWeight: "700",
  },
  coinSubname: {
    fontSize: 11,
    marginTop: 1,
  },
  rowMid: {
    width: 90,
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rowRight: {
    width: 72,
    alignItems: "flex-end",
  },
  changeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 60,
    alignItems: "center",
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
