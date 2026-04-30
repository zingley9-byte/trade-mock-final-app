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
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const colors = useColors();
  const { candles, chartType, setChartType } = useTradingContext();
  const [chartExpanded, setChartExpanded] = useState(false);
  const chartH = chartExpanded ? SCREEN_HEIGHT * 0.65 : SCREEN_HEIGHT * 0.38;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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

      <View style={[styles.infoCard, { backgroundColor: colors.card, margin: 14, borderRadius: 12, borderColor: colors.border }]}>
        <Text style={[styles.infoTitle, { color: colors.mutedForeground }]}>About This Chart</Text>
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          Switch symbols using the dropdown. Tap the chart icon to toggle Candle / Line mode. Use the Trade tab to open positions.
        </Text>
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
  infoCard: {
    padding: 14,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 11, fontWeight: "600" as const, marginBottom: 4, letterSpacing: 0.5 },
  infoText: { fontSize: 13, lineHeight: 18 },
});
