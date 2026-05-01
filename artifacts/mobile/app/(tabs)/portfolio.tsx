import React from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

const INITIAL_BALANCE = 1000000;

export default function PortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    balance,
    positions,
    currentPrice,
    getRunningPnL,
    getTotalPortfolioValue,
    closePosition,
    resetAccount,
    resetsRemaining,
    currencyMode,
    usdToInr,
  } = useTradingContext();

  const runningPnL = getRunningPnL();
  const totalValue = getTotalPortfolioValue();
  const totalPnL = totalValue - INITIAL_BALANCE;
  const totalPnLPct = (totalPnL / INITIAL_BALANCE) * 100;

  const isUSD = currencyMode === "usd";

  function fmt(amount: number, decimals = 2): string {
    if (isUSD) {
      const usd = amount / usdToInr;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  function handleReset() {
    if (resetsRemaining === 0) {
      Alert.alert(
        "⚠️ Reset Limit Reached",
        "You have used all 2 resets for this 30-day period. Please wait for your oldest reset to expire before trying again."
      );
      return;
    }
    const afterReset = resetsRemaining - 1;
    Alert.alert(
      "⚠️ Reset Warning",
      `You only get 2 resets every 30 days.\n\nAfter this reset, you will have ${afterReset} reset${afterReset !== 1 ? "s" : ""} remaining in this 30-day window.\n\nYour balance will be restored to ${isUSD ? "$1,000,000" : "₹10,00,000"} and all trade history will be cleared.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            const result = resetAccount();
            if (!result.allowed) Alert.alert("⚠️ Limit Reached", result.message);
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 90,
      }}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Portfolio</Text>
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetBtn, { borderColor: colors.border, opacity: resetsRemaining === 0 ? 0.4 : 1 }]}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>
            Reset ({resetsRemaining}/2)
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Total Portfolio Value ─────────────────────────────────────────── */}
      <View style={[styles.portfolioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.portfolioLabel, { color: colors.mutedForeground }]}>
          Total Portfolio Value
        </Text>
        <Text style={[styles.portfolioValue, { color: colors.foreground }]}>
          {fmt(totalValue)}
        </Text>
        <View style={styles.pnlRow}>
          <Text style={[styles.totalPnL, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
            {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)}
          </Text>
          <View style={[styles.pnlBadge, { backgroundColor: totalPnL >= 0 ? colors.bullBg : colors.bearBg }]}>
            <Text style={[styles.pnlBadgeText, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
              {totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ── Open Positions ────────────────────────────────────────────────── */}
      {positions.length === 0 ? (
        <View style={styles.emptyPos}>
          <Feather name="inbox" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No open positions</Text>
        </View>
      ) : (
        <View style={{ marginHorizontal: 14, marginTop: 4 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Open Positions ({positions.length})
          </Text>
          {positions.map((pos) => {
            const priceDiff =
              pos.side === "buy"
                ? currentPrice - pos.entryPrice
                : pos.entryPrice - currentPrice;
            const posPnl = priceDiff * pos.quantity * pos.leverage;
            const pnlPct = (posPnl / pos.margin) * 100;

            return (
              <View
                key={pos.id}
                style={[styles.posCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.posTop}>
                  <View style={styles.posLeft}>
                    <View style={[styles.sideBadge, { backgroundColor: pos.side === "buy" ? colors.bullBg : colors.bearBg }]}>
                      <Text style={[styles.sideText, { color: pos.side === "buy" ? colors.bull : colors.bear }]}>
                        {pos.side === "buy" ? "LONG" : "SHORT"}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.posSymbol, { color: colors.foreground }]}>{pos.symbol.label}</Text>
                      <Text style={[styles.posLev, { color: colors.primary }]}>x{pos.leverage}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: colors.destructive }]}
                    onPress={() => closePosition(pos.id)}
                  >
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.posDetails}>
                  <Detail label="Entry" value={`$${pos.entryPrice.toFixed(4)}`} colors={colors} />
                  <Detail label="Current" value={`$${currentPrice.toFixed(4)}`} colors={colors} />
                  <Detail label="Qty" value={`${pos.quantity}`} colors={colors} />
                  <Detail label="Margin" value={fmt(pos.margin, 0)} colors={colors} />
                </View>
                <View style={[styles.pnlRow, { paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                  <Text style={[styles.posLabel, { color: colors.mutedForeground }]}>P&L</Text>
                  <Text style={[styles.posPnl, { color: posPnl >= 0 ? colors.bull : colors.bear }]}>
                    {posPnl >= 0 ? "+" : ""}{fmt(posPnl)}
                    {"  "}
                    <Text style={{ fontSize: 12 }}>({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)</Text>
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Detail({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "700" as const },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetText: { fontSize: 13, fontWeight: "500" as const },
  portfolioCard: {
    marginHorizontal: 14,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
    alignItems: "center",
  },
  portfolioLabel: { fontSize: 12, marginBottom: 6 },
  portfolioValue: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -1 },
  pnlRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  totalPnL: { fontSize: 17, fontWeight: "700" as const },
  pnlBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pnlBadgeText: { fontSize: 12, fontWeight: "700" as const },
  sectionTitle: { fontSize: 15, fontWeight: "700" as const, marginBottom: 10 },
  emptyPos: { alignItems: "center", justifyContent: "center", gap: 8, marginTop: 60 },
  emptyText: { fontSize: 15, fontWeight: "500" as const },
  posCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  posTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  posLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  sideText: { fontSize: 11, fontWeight: "700" as const },
  posSymbol: { fontSize: 14, fontWeight: "700" as const },
  posLev: { fontSize: 12, fontWeight: "600" as const },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  closeBtnText: { fontSize: 13, fontWeight: "600" as const, color: "#fff" },
  posDetails: { flexDirection: "row", gap: 12, marginBottom: 8 },
  detailItem: {},
  detailLabel: { fontSize: 10, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500" as const },
  posLabel: { fontSize: 12 },
  posPnl: { fontSize: 16, fontWeight: "700" as const, flex: 1, textAlign: "right" },
});
