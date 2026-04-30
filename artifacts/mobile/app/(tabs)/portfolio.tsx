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
    tradeHistory,
    currencyMode,
    usdToInr,
  } = useTradingContext();

  const runningPnL = getRunningPnL();
  const totalValue = getTotalPortfolioValue();
  const totalPnL = totalValue - INITIAL_BALANCE;
  const totalPnLPct = (totalPnL / INITIAL_BALANCE) * 100;
  const marginUsed = positions.reduce((s, p) => s + p.margin, 0);

  const winTrades = tradeHistory.filter((t) => t.pnl > 0).length;
  const winRate = tradeHistory.length > 0 ? (winTrades / tradeHistory.length) * 100 : 0;
  const totalRealizedPnL = tradeHistory.reduce((s, t) => s + t.pnl, 0);

  const isUSD = currencyMode === "usd";
  const sym = isUSD ? "$" : "₹";

  function fmt(amount: number, decimals = 2): string {
    if (isUSD) {
      const usd = amount / usdToInr;
      if (Math.abs(usd) >= 1_000_000)
        return `$${(usd / 1_000_000).toFixed(2)}M`;
      if (Math.abs(usd) >= 1_000)
        return `$${usd.toLocaleString("en-US", { maximumFractionDigits: decimals })}`;
      return `$${usd.toFixed(decimals)}`;
    }
    if (Math.abs(amount) >= 10_000_000)
      return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
    if (Math.abs(amount) >= 100_000)
      return `₹${(amount / 100_000).toFixed(2)}L`;
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
  }

  function handleReset() {
    Alert.alert(
      "Reset Account",
      `This will reset your balance to ${isUSD ? "$1,000,000" : "₹10,00,000"} and clear all history.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetAccount },
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
          style={[styles.resetBtn, { borderColor: colors.border }]}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.portfolioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.portfolioLabel, { color: colors.mutedForeground }]}>
          Total Portfolio Value
        </Text>
        <Text style={[styles.portfolioValue, { color: colors.foreground }]}>
          {fmt(totalValue)}
        </Text>
        <View style={styles.pnlRow}>
          <Text
            style={[
              styles.totalPnL,
              { color: totalPnL >= 0 ? colors.bull : colors.bear },
            ]}
          >
            {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)}
          </Text>
          <View
            style={[
              styles.pnlBadge,
              { backgroundColor: totalPnL >= 0 ? colors.bullBg : colors.bearBg },
            ]}
          >
            <Text style={[styles.pnlBadgeText, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
              {totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Available Balance"
          value={fmt(balance, 0)}
          icon="dollar-sign"
          colors={colors}
          iconColor={colors.primary}
        />
        <StatCard
          label="Margin Used"
          value={fmt(marginUsed, 0)}
          icon="lock"
          colors={colors}
          iconColor="#f59e0b"
        />
        <StatCard
          label="Running P&L"
          value={`${runningPnL >= 0 ? "+" : ""}${fmt(runningPnL)}`}
          icon="activity"
          colors={colors}
          iconColor={runningPnL >= 0 ? colors.bull : colors.bear}
          valueColor={runningPnL >= 0 ? colors.bull : colors.bear}
        />
        <StatCard
          label="Realized P&L"
          value={`${totalRealizedPnL >= 0 ? "+" : ""}${fmt(totalRealizedPnL)}`}
          icon="trending-up"
          colors={colors}
          iconColor={totalRealizedPnL >= 0 ? colors.bull : colors.bear}
          valueColor={totalRealizedPnL >= 0 ? colors.bull : colors.bear}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon="award"
          colors={colors}
          iconColor="#6366f1"
        />
        <StatCard
          label="Total Trades"
          value={`${tradeHistory.length}`}
          icon="list"
          colors={colors}
          iconColor={colors.primary}
        />
      </View>

      {positions.length > 0 && (
        <View style={{ marginHorizontal: 14, marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Open Positions ({positions.length})
          </Text>
          {positions.map((pos) => {
            const posSymbol = pos.symbol.type === "crypto" ? "$" : "₹";
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
                  <Detail label="Entry" value={`${posSymbol}${pos.entryPrice.toFixed(2)}`} colors={colors} />
                  <Detail label="Current" value={`${posSymbol}${currentPrice.toFixed(2)}`} colors={colors} />
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

function StatCard({
  label,
  value,
  icon,
  colors,
  iconColor,
  valueColor,
}: {
  label: string;
  value: string;
  icon: string;
  colors: ReturnType<typeof useColors>;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}20` }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

function Detail({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
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
    marginBottom: 14,
    alignItems: "center",
  },
  portfolioLabel: { fontSize: 12, marginBottom: 6 },
  portfolioValue: { fontSize: 30, fontWeight: "700" as const, letterSpacing: -1 },
  pnlRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  totalPnL: { fontSize: 17, fontWeight: "700" as const },
  pnlBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pnlBadgeText: { fontSize: 12, fontWeight: "700" as const },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  statCard: {
    width: "47%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 11, marginTop: 2 },
  statValue: { fontSize: 16, fontWeight: "700" as const },
  sectionTitle: { fontSize: 15, fontWeight: "700" as const, marginBottom: 10 },
  posCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  posTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
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
