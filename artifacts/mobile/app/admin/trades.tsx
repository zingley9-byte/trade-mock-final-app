import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminUser, useAdmin } from "@/context/AdminContext";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";
const GOLD     = "#f59e0b";

export default function AdminTrades() {
  const insets = useSafeAreaInsets();
  const { users, refreshUsers, isAdmin, loading: authLoading } = useAdmin();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"trades" | "pnl">("trades");

  useEffect(() => {
    if (!authLoading) {
      refreshUsers().finally(() => setLoading(false));
    }
  }, [authLoading]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: ADMIN_BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAdmin) { router.replace("/admin"); return null; }

  const traders = users.filter((u) => u.tradeCount > 0);
  const totalTrades = users.reduce((s, u) => s + u.tradeCount, 0);
  const totalPnl    = users.reduce((s, u) => s + u.totalPnl, 0);
  const activeTraders = traders.length;

  const sorted = [...traders].sort((a, b) =>
    sortBy === "trades" ? b.tradeCount - a.tradeCount : b.totalPnl - a.totalPnl
  );

  const filtered = query.trim()
    ? sorted.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )
    : sorted;

  function renderTrader({ item: u, index }: { item: AdminUser; index: number }) {
    const pnlColor = u.totalPnl >= 0 ? BULL : BEAR;
    const rankColor = index === 0 ? GOLD : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : MUTED;
    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => router.push({ pathname: "/admin/user-detail", params: { uid: u.uid } })}
        activeOpacity={0.7}
      >
        <View style={[s.rank, { borderColor: rankColor + "55" }]}>
          <Text style={[s.rankText, { color: rankColor }]}>#{index + 1}</Text>
        </View>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.name} numberOfLines={1}>{u.name}</Text>
            {u.blocked && <View style={s.blockedBadge}><Text style={s.blockedText}>BLOCKED</Text></View>}
          </View>
          <Text style={s.email} numberOfLines={1}>{u.email}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <SvgIcon name="swap-horizontal-outline" size={11} color={GOLD} />
            <Text style={[s.tradeCount, { color: GOLD }]}>{u.tradeCount} trades</Text>
          </View>
          <Text style={[s.pnl, { color: pnlColor }]}>
            {u.totalPnl >= 0 ? "+" : ""}₹{Math.abs(u.totalPnl / 1000).toFixed(1)}K
          </Text>
        </View>
        <SvgIcon name="chevron-forward-outline" size={14} color={MUTED} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Trades</Text>
      </View>

      {/* Summary strip */}
      <View style={s.summaryRow}>
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: GOLD }]}>{totalTrades}</Text>
          <Text style={s.summarySub}>Total Trades</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: PRIMARY }]}>{activeTraders}</Text>
          <Text style={s.summarySub}>Traders</Text>
        </View>
        <View style={s.divider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: totalPnl >= 0 ? BULL : BEAR }]}>
            {totalPnl >= 0 ? "+" : ""}₹{Math.abs(totalPnl / 1000).toFixed(1)}K
          </Text>
          <Text style={s.summarySub}>Combined P&L</Text>
        </View>
      </View>

      {/* Search + Sort */}
      <View style={s.controls}>
        <View style={s.searchWrap}>
          <SvgIcon name="search-outline" size={15} color={MUTED} />
          <TextInput
            style={s.searchInput}
            placeholder="Search trader…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <SvgIcon name="close-outline" size={14} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.sortRow}>
          {(["trades", "pnl"] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.sortBtn, sortBy === opt && s.sortBtnActive]}
              onPress={() => setSortBy(opt)}
            >
              <Text style={[s.sortText, sortBy === opt && s.sortTextActive]}>
                {opt === "trades" ? "By Trades" : "By P&L"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <SvgIcon name="swap-horizontal-outline" size={40} color={MUTED} />
          <Text style={s.emptyText}>{query ? "No results found" : "No trades yet"}</Text>
          <Text style={s.emptySub}>Trades will appear here once users start trading</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={renderTrader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 }} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG, flex: 1 },

  summaryRow: {
    flexDirection: "row", backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  summaryVal: { fontSize: 18, fontWeight: "700" },
  summarySub: { fontSize: 10, color: MUTED, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 10 },

  controls: { paddingHorizontal: 14, paddingTop: 12, gap: 8 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, color: FG, fontSize: 14 },
  sortRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  sortBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE,
    alignItems: "center",
  },
  sortBtnActive: { backgroundColor: GOLD + "22", borderColor: GOLD },
  sortText: { fontSize: 12, fontWeight: "600", color: MUTED },
  sortTextActive: { color: GOLD },

  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: ADMIN_BG,
  },
  rank: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 11, fontWeight: "700" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3b82f622", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#3b82f6" },
  name: { fontSize: 14, fontWeight: "600", color: FG, maxWidth: 140 },
  email: { fontSize: 11, color: MUTED, marginTop: 1, maxWidth: 140 },
  tradeCount: { fontSize: 12, fontWeight: "700" },
  pnl: { fontSize: 12, fontWeight: "600" },
  blockedBadge: { backgroundColor: BEAR + "22", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  blockedText: { fontSize: 8, fontWeight: "700", color: BEAR, letterSpacing: 0.5 },
  emptyText: { fontSize: 14, color: MUTED, fontWeight: "600" },
  emptySub: { fontSize: 12, color: MUTED, textAlign: "center", maxWidth: 240 },
});
