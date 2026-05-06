import React, { useState, useCallback } from "react";
import TradeDetailModal from "@/components/TradeDetailModal";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTradingContext, TradeHistory } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import CoinLogo from "@/components/CoinLogo";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(openedAt: number, closedAt: number): string {
  const ms = closedAt - openedAt;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    tradeHistory,
    balance,
    positions,
    getRunningPnL,
    currencyMode,
    usdToInr,
    refreshPrices,
  } = useTradingContext();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshPrices(); } finally { setRefreshing(false); }
  }, [refreshPrices]);
  const [filter, setFilter]           = useState<"all" | "win" | "loss">("all");
  const [detailTrade, setDetailTrade] = useState<TradeHistory | null>(null);

  const isUSD = currencyMode === "usd";

  function fmt(amount: number, decimals = 2): string {
    if (isUSD) {
      const usd = amount / usdToInr;
      return `$${usd.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  const filtered = tradeHistory.filter((t) => {
    if (filter === "win") return t.pnl > 0;
    if (filter === "loss") return t.pnl <= 0;
    return true;
  });

  const totalPnL       = tradeHistory.reduce((s, t) => s + t.pnl, 0);
  const wins           = tradeHistory.filter((t) => t.pnl > 0).length;
  const losses         = tradeHistory.filter((t) => t.pnl <= 0).length;
  const winRate        = tradeHistory.length > 0 ? (wins / tradeHistory.length) * 100 : 0;
  const marginUsed     = positions.reduce((s, p) => s + p.margin, 0);
  const runningPnL     = getRunningPnL();

  function renderItem({ item }: { item: TradeHistory }) {
    const isWin = item.pnl > 0;
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setDetailTrade(item)}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: isWin ? `${colors.bull}40` : `${colors.bear}40` },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <CoinLogo symbolId={item.symbol.id} size={36} />
            <View
              style={[
                styles.sideBadge,
                { backgroundColor: item.side === "buy" ? colors.bullBg : colors.bearBg },
              ]}
            >
              <Text
                style={[
                  styles.sideText,
                  { color: item.side === "buy" ? colors.bull : colors.bear },
                ]}
              >
                {item.side === "buy" ? "LONG" : "SHORT"}
              </Text>
            </View>
            <View>
              <Text style={[styles.symbolText, { color: colors.foreground }]}>
                {item.symbol.label}
              </Text>
              <Text style={[styles.subText, { color: colors.mutedForeground }]}>
                x{item.leverage} · {formatDate(item.closedAt)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text
              style={[
                styles.pnlText,
                { color: isWin ? colors.bull : colors.bear },
              ]}
            >
              {isWin ? "+" : ""}{fmt(item.pnl)}
            </Text>
            <View
              style={[
                styles.pnlBadge,
                { backgroundColor: isWin ? colors.bullBg : colors.bearBg },
              ]}
            >
              <Text style={[styles.pnlPct, { color: isWin ? colors.bull : colors.bear }]}>
                {item.pnlPct >= 0 ? "+" : ""}{item.pnlPct.toFixed(2)}%
              </Text>
            </View>
            <Text style={[styles.detailsHint, { color: colors.mutedForeground }]}>Details ›</Text>
          </View>
        </View>

        <View style={[styles.details, { borderTopColor: colors.border }]}>
          <DetailPair label="Entry" value={`$${item.entryPrice.toFixed(4)}`} colors={colors} />
          <DetailPair label="Exit" value={`$${item.exitPrice.toFixed(4)}`} colors={colors} />
          <DetailPair label="Qty" value={`${item.quantity}`} colors={colors} />
          <DetailPair label="Margin" value={fmt(item.margin, 0)} colors={colors} />
          <DetailPair label="Duration" value={formatDuration(item.openedAt, item.closedAt)} colors={colors} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        <View style={[styles.pnlSummary, { backgroundColor: totalPnL >= 0 ? colors.bullBg : colors.bearBg }]}>
          <Text style={[styles.pnlSummaryText, { color: totalPnL >= 0 ? colors.bull : colors.bear }]}>
            {totalPnL >= 0 ? "+" : ""}{fmt(totalPnL)}
          </Text>
        </View>
      </View>

      {/* ── Account stats ──────────────────────────────────────────────────── */}
      <View style={styles.accountGrid}>
        <StatChip
          label="Available Balance"
          value={fmt(balance, 0)}
          valueColor={colors.foreground}
          colors={colors}
        />
        <StatChip
          label="Margin Used"
          value={fmt(marginUsed, 0)}
          valueColor="#f59e0b"
          colors={colors}
        />
        <StatChip
          label="Running P&L"
          value={`${runningPnL >= 0 ? "+" : ""}${fmt(runningPnL)}`}
          valueColor={runningPnL >= 0 ? colors.bull : colors.bear}
          colors={colors}
        />
        <StatChip
          label="Realized P&L"
          value={`${totalPnL >= 0 ? "+" : ""}${fmt(totalPnL)}`}
          valueColor={totalPnL >= 0 ? colors.bull : colors.bear}
          colors={colors}
        />
      </View>

      {/* ── Trade summary chips ────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{tradeHistory.length}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.bull }]}>{wins}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Wins</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.bear }]}>{losses}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Losses</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>
            {winRate.toFixed(0)}%
          </Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Win Rate</Text>
        </View>
      </View>

      {/* ── Filter ─────────────────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {(["all", "win", "loss"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn,
              { backgroundColor: filter === f ? colors.primary : colors.muted },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Trade list ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <SvgIcon name="time-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {tradeHistory.length === 0 ? "No trades yet" : "No trades match filter"}
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            {tradeHistory.length === 0 ? "Open a position to start trading" : "Try a different filter"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingBottom: Platform.OS === "web" ? 80 : insets.bottom + 90,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#00c896"]}
              tintColor="#00c896"
            />
          }
        />
      )}

      {/* ── Trade Detail Modal ──────────────────────────────────────────── */}
      <TradeDetailModal
        visible={!!detailTrade}
        onClose={() => setDetailTrade(null)}
        trade={detailTrade ?? undefined}
        currencyMode={currencyMode}
        usdToInr={usdToInr}
      />
    </View>
  );
}

function StatChip({
  label,
  value,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  valueColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.accountChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.accountLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.accountValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function DetailPair({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View>
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
  title: { fontSize: 22, fontWeight: "700" as const },
  pnlSummary: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pnlSummaryText: { fontSize: 14, fontWeight: "700" as const },

  // Account stats grid (2-column)
  accountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  accountChip: {
    width: "47.5%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  accountLabel: { fontSize: 10, fontWeight: "500" as const },
  accountValue: { fontSize: 14, fontWeight: "700" as const },

  // Trade summary row
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  statChip: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statNum: { fontSize: 15, fontWeight: "700" as const },
  statLbl: { fontSize: 10, marginTop: 2 },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8 },
  filterText: { fontSize: 13, fontWeight: "600" as const },

  card: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 2 },
  sideText: { fontSize: 10, fontWeight: "700" as const },
  symbolText: { fontSize: 15, fontWeight: "700" as const },
  subText: { fontSize: 11, marginTop: 2 },
  pnlText: { fontSize: 16, fontWeight: "700" as const },
  pnlBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 3 },
  pnlPct: { fontSize: 11, fontWeight: "600" as const },
  detailsHint: { fontSize: 11, fontWeight: "600" as const, opacity: 0.65 },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 10, marginBottom: 2 },
  detailValue: { fontSize: 12, fontWeight: "500" as const },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600" as const },
  emptySubText: { fontSize: 13 },
});
