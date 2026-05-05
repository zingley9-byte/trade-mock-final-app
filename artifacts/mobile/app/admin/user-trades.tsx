import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminTradeRecord, useAdmin } from "@/context/AdminContext";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";
const GOLD     = "#f59e0b";

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDuration(openedAt: number, closedAt: number) {
  const ms = closedAt - openedAt;
  const m  = Math.floor(ms / 60000);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function UserTrades() {
  const insets = useSafeAreaInsets();
  const { uid, name } = useLocalSearchParams<{ uid: string; name: string }>();
  const { getUserTrades, isAdmin, loading: authLoading } = useAdmin();
  const [trades, setTrades] = useState<AdminTradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && uid) {
      getUserTrades(uid).then((list) => {
        setTrades(list);
        setLoading(false);
      });
    }
  }, [authLoading, uid]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: ADMIN_BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAdmin) { router.replace("/admin"); return null; }

  const totalPnl   = trades.reduce((s, t) => s + t.pnl, 0);
  const wins       = trades.filter((t) => t.pnl > 0).length;
  const winRate    = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

  // Group trades by date
  const grouped: { date: string; trades: AdminTradeRecord[] }[] = [];
  trades.forEach((t) => {
    const dateStr = formatDate(t.closedAt);
    const existing = grouped.find((g) => g.date === dateStr);
    if (existing) existing.trades.push(t);
    else grouped.push({ date: dateStr, trades: [t] });
  });

  type ListItem = { type: "header"; date: string } | { type: "trade"; trade: AdminTradeRecord };
  const flatList: ListItem[] = [];
  grouped.forEach((g) => {
    flatList.push({ type: "header", date: g.date });
    g.trades.forEach((t) => flatList.push({ type: "trade", trade: t }));
  });

  function renderItem({ item }: { item: ListItem }) {
    if (item.type === "header") {
      return (
        <View style={s.dateHeader}>
          <View style={s.dateLine} />
          <Text style={s.dateText}>{item.date}</Text>
          <View style={s.dateLine} />
        </View>
      );
    }
    const t = item.trade;
    const pnlColor = t.pnl >= 0 ? BULL : BEAR;
    const sideColor = t.side === "buy" ? BULL : BEAR;
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          {/* Side badge */}
          <View style={[s.sideBadge, { backgroundColor: sideColor + "22" }]}>
            <Text style={[s.sideText, { color: sideColor }]}>
              {t.side === "buy" ? "▲ BUY" : "▼ SELL"}
            </Text>
          </View>

          {/* Symbol */}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.symbol}>{t.symbolLabel}</Text>
            <Text style={s.symbolName}>{t.symbolName}</Text>
          </View>

          {/* PnL */}
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.pnl, { color: pnlColor }]}>
              {t.pnl >= 0 ? "+" : ""}₹{Math.abs(t.pnl).toFixed(0)}
            </Text>
            <Text style={[s.pnlPct, { color: pnlColor }]}>
              {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Details row */}
        <View style={s.detailsRow}>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>ENTRY</Text>
            <Text style={s.detailVal}>${t.entryPrice.toFixed(2)}</Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>EXIT</Text>
            <Text style={s.detailVal}>${t.exitPrice.toFixed(2)}</Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>QTY</Text>
            <Text style={s.detailVal}>{t.quantity}</Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailLabel}>LEVERAGE</Text>
            <Text style={[s.detailVal, { color: GOLD }]}>{t.leverage}×</Text>
          </View>
        </View>

        {/* Time row */}
        <View style={s.timeRow}>
          <SvgIcon name="time-outline" size={11} color={MUTED} />
          <Text style={s.timeText}>
            Closed {formatTime(t.closedAt)} · Duration {formatDuration(t.openedAt, t.closedAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Trade History</Text>
          <Text style={s.headerSub}>{name ?? uid}</Text>
        </View>
      </View>

      {/* Summary strip */}
      {!loading && trades.length > 0 && (
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, { color: GOLD }]}>{trades.length}</Text>
            <Text style={s.summarySub}>Total Trades</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, { color: totalPnl >= 0 ? BULL : BEAR }]}>
              {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl / 1000).toFixed(1)}K
            </Text>
            <Text style={s.summarySub}>Total P&L</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, { color: winRate >= 50 ? BULL : BEAR }]}>{winRate}%</Text>
            <Text style={s.summarySub}>Win Rate</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryVal, { color: PRIMARY }]}>{wins}</Text>
            <Text style={s.summarySub}>Wins</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={{ color: MUTED, marginTop: 10, fontSize: 13 }}>Loading trade history…</Text>
        </View>
      ) : trades.length === 0 ? (
        <View style={s.center}>
          <SvgIcon name="swap-horizontal-outline" size={44} color={MUTED} />
          <Text style={s.emptyTitle}>No trades yet</Text>
          <Text style={s.emptySub}>
            This user hasn't closed any positions.{"\n"}Trades appear here once they close a position.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatList}
          keyExtractor={(item) => item.type === "header" ? item.date : item.trade.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: FG },
  headerSub: { fontSize: 12, color: MUTED, marginTop: 1 },

  summaryRow: {
    flexDirection: "row", backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  summaryVal: { fontSize: 16, fontWeight: "700" },
  summarySub: { fontSize: 10, color: MUTED, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 10 },

  dateHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dateText: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.5 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14, gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  sideBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sideText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  symbol: { fontSize: 15, fontWeight: "700", color: FG },
  symbolName: { fontSize: 11, color: MUTED, marginTop: 1 },
  pnl: { fontSize: 15, fontWeight: "700" },
  pnlPct: { fontSize: 11, fontWeight: "600", marginTop: 1 },

  detailsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    paddingTop: 10,
  },
  detailItem: { flex: 1, alignItems: "center", gap: 3 },
  detailLabel: { fontSize: 9, color: MUTED, fontWeight: "700", letterSpacing: 0.5 },
  detailVal: { fontSize: 12, fontWeight: "600", color: FG },

  timeRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, paddingTop: 8,
  },
  timeText: { fontSize: 11, color: MUTED },

  emptyTitle: { fontSize: 16, fontWeight: "600", color: MUTED },
  emptySub: { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 20 },
});
