import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

export default function PriceBar() {
  const colors = useColors();
  const {
    selectedSymbol,
    currentPrice,
    priceChange24h,
    high24h,
    low24h,
    volume24h,
    isConnected,
    dataSource,
    currencyMode,
    usdToInr,
  } = useTradingContext();

  const isPositive = priceChange24h >= 0;

  function formatPrice(price: number): string {
    if (price === 0) return "—";
    const p = currencyMode === "inr" ? price * usdToInr : price;
    if (p >= 100000) return p.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    if (p >= 1000) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  }

  const currSymbol = currencyMode === "inr" ? "₹" : "$";

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.priceMain}>
        <Text style={[styles.price, { color: isPositive ? colors.bull : colors.bear }]}>
          {currSymbol}{formatPrice(currentPrice)}
        </Text>
        <View style={[styles.badge, { backgroundColor: isPositive ? colors.bullBg : colors.bearBg }]}>
          <Text style={[styles.change, { color: isPositive ? colors.bull : colors.bear }]}>
            {isPositive ? "+" : ""}{priceChange24h.toFixed(2)}%
          </Text>
        </View>
        {isConnected && <View style={[styles.dot, { backgroundColor: colors.bull }]} />}
        {dataSource === "mexc" && (
          <View style={[styles.sourceBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>Data: MEXC</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.stats}>
          <Stat label="24H High" value={`${currSymbol}${formatPrice(high24h)}`} color={colors.bull} muted={colors.mutedForeground} />
          <Stat label="24H Low" value={`${currSymbol}${formatPrice(low24h)}`} color={colors.bear} muted={colors.mutedForeground} />
          <Stat label="Volume" value={volume24h > 0 ? volume24h.toFixed(0) : "—"} color={colors.mutedForeground} muted={colors.mutedForeground} />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  priceMain: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  price: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  change: { fontSize: 12, fontWeight: "700" as const },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  sourceBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sourceText: { fontSize: 9, fontWeight: "600" as const, letterSpacing: 0.2 },
  stats: { flexDirection: "row", gap: 16 },
  stat: {},
  statLabel: { fontSize: 9, marginBottom: 1, letterSpacing: 0.3 },
  statValue: { fontSize: 12, fontWeight: "600" as const },
});
