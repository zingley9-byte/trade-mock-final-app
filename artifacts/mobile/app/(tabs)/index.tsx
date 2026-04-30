import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
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

function SymbolChip({
  symbol,
  isSelected,
  currentPrice,
  currencyMode,
  onPress,
  colors,
}: {
  symbol: MarketSymbol;
  isSelected: boolean;
  currentPrice: number;
  currencyMode: "usd" | "inr";
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const ticker = symbol.label.replace("/USDT", "").replace("/", "");
  const priceStr =
    isSelected && currentPrice > 0
      ? currentPrice >= 1000
        ? `${currencyMode === "usd" ? "$" : "₹"}${currentPrice.toLocaleString(
            currencyMode === "usd" ? "en-US" : "en-IN",
            { maximumFractionDigits: 0 }
          )}`
        : `${currencyMode === "usd" ? "$" : "₹"}${currentPrice.toFixed(2)}`
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.chipTicker,
          { color: isSelected ? "#fff" : colors.foreground },
        ]}
      >
        {ticker}
      </Text>
      {priceStr ? (
        <Text
          style={[
            styles.chipPrice,
            { color: isSelected ? "rgba(255,255,255,0.8)" : colors.mutedForeground },
          ]}
        >
          {priceStr}
        </Text>
      ) : null}
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
    selectedSymbol,
    setSelectedSymbol,
    currentPrice,
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
            onPress={() =>
              setChartType(chartType === "candle" ? "line" : "candle")
            }
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

      <View
        style={[
          styles.chartWrap,
          { height: chartH, backgroundColor: colors.chartBg },
        ]}
      >
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

      <View
        style={[
          styles.stripContainer,
          { borderTopColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <FlatList
          data={visibleSymbols}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.stripContent}
          renderItem={({ item }) => (
            <SymbolChip
              symbol={item}
              isSelected={item.id === selectedSymbol.id}
              currentPrice={currentPrice}
              currencyMode={currencyMode}
              onPress={() => setSelectedSymbol(item)}
              colors={colors}
            />
          )}
        />
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
  stripContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  stripContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 64,
  },
  chipTicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chipPrice: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
});
