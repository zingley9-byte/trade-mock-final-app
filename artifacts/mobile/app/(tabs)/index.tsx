import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CandlestickChart from "@/components/CandlestickChart";
import SymbolSelector from "@/components/SymbolSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import OrderPanel from "@/components/OrderPanel";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TradingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    selectedSymbol,
    currentPrice,
    candles,
    chartType,
    setChartType,
    theme,
    setTheme,
    priceChange24h,
    high24h,
    low24h,
    volume24h,
    isConnected,
  } = useTradingContext();

  const [chartExpanded, setChartExpanded] = useState(false);
  const chartH = chartExpanded ? SCREEN_HEIGHT * 0.55 : 220;
  const isPositive = priceChange24h >= 0;
  const currencySymbol = selectedSymbol.type === "crypto" ? "$" : "₹";

  function formatPrice(price: number): string {
    if (price === 0) return "—";
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? 67 : insets.top,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.header, borderBottomColor: colors.border },
        ]}
      >
        <SymbolSelector />
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setChartType(chartType === "candle" ? "line" : "candle")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather
              name={chartType === "candle" ? "bar-chart-2" : "trending-up"}
              size={16}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather
              name={theme === "dark" ? "sun" : "moon"}
              size={16}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.priceBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.priceMain}>
          <Text style={[styles.currentPrice, { color: isPositive ? colors.bull : colors.bear }]}>
            {currencySymbol}{formatPrice(currentPrice)}
          </Text>
          <View style={[styles.changeBadge, { backgroundColor: isPositive ? colors.bullBg : colors.bearBg }]}>
            <Text style={[styles.changeText, { color: isPositive ? colors.bull : colors.bear }]}>
              {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
            </Text>
          </View>
          {isConnected && (
            <View style={[styles.liveDot, { backgroundColor: colors.bull }]} />
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <StatItem label="24H High" value={`${currencySymbol}${formatPrice(high24h)}`} color={colors.bull} colors={colors} />
            <StatItem label="24H Low" value={`${currencySymbol}${formatPrice(low24h)}`} color={colors.bear} colors={colors} />
            <StatItem label="Volume" value={volume24h > 0 ? volume24h.toFixed(0) : "—"} color={colors.mutedForeground} colors={colors} />
          </View>
        </ScrollView>
      </View>

      <View style={[styles.chartContainer, { height: chartH, backgroundColor: colors.chartBg }]}>
        <View style={styles.timeframeRow}>
          <TimeframeSelector />
          <TouchableOpacity
            onPress={() => setChartExpanded(!chartExpanded)}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather
              name={chartExpanded ? "minimize-2" : "maximize-2"}
              size={14}
              color={colors.foreground}
            />
          </TouchableOpacity>
        </View>
        <CandlestickChart
          candles={candles}
          width={SCREEN_WIDTH}
          height={chartH - 40}
          chartType={chartType}
          bullColor={colors.bull}
          bearColor={colors.bear}
          textColor={colors.mutedForeground}
          gridColor={colors.border}
          bgColor={colors.chartBg}
        />
      </View>

      <View style={[styles.orderContainer, { flex: 1 }]}>
        <OrderPanel />
      </View>
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerRight: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  priceBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  priceMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  currentPrice: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.5 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  changeText: { fontSize: 12, fontWeight: "700" as const },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  statsRow: { flexDirection: "row", gap: 16 },
  statItem: { alignItems: "flex-start" },
  statLabel: { fontSize: 9, marginBottom: 1, letterSpacing: 0.3 },
  statValue: { fontSize: 12, fontWeight: "600" as const },
  chartContainer: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f022",
  },
  timeframeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  orderContainer: { overflow: "hidden" },
});
