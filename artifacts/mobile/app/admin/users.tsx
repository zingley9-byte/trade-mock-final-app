import { router, useLocalSearchParams } from "expo-router";
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

const USD_TO_INR = 95;

function fmtPnl(usdValue: number, cur: "usd" | "inr"): string {
  const sign = usdValue >= 0 ? "+" : "-";
  if (cur === "usd") {
    const abs = Math.abs(usdValue);
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(2)}`;
  } else {
    const inr = Math.abs(usdValue) * USD_TO_INR;
    if (inr >= 1e7) return `${sign}₹${(inr / 1e7).toFixed(2)}Cr`;
    if (inr >= 1e5) return `${sign}₹${(inr / 1e5).toFixed(2)}L`;
    if (inr >= 1e3) return `${sign}₹${(inr / 1e3).toFixed(1)}K`;
    return `${sign}₹${inr.toFixed(0)}`;
  }
}

function fmtBalance(usdValue: number, cur: "usd" | "inr"): string {
  if (cur === "usd") return `$${usdValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const inr = usdValue * USD_TO_INR;
  return `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";

type FilterMode = "all" | "active" | "blocked";

export default function AdminUsers() {
  const insets = useSafeAreaInsets();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const { users, refreshUsers, isAdmin, loading: authLoading } = useAdmin();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminCurrency, setAdminCurrency] = useState<"usd" | "inr">("inr");
  const [filterMode, setFilterMode] = useState<FilterMode>(
    filterParam === "active" ? "active" : filterParam === "blocked" ? "blocked" : "all"
  );

  useEffect(() => {
    if (!authLoading) {
      refreshUsers().finally(() => setLoading(false));
    }
  }, [authLoading]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await refreshUsers(); } finally { setRefreshing(false); }
  }

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: ADMIN_BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    router.replace("/admin");
    return null;
  }

  const activeCount  = users.filter((u) => !u.blocked).length;
  const blockedCount = users.filter((u) => u.blocked).length;

  const filterTabs: { key: FilterMode; label: string; count: number; color: string }[] = [
    { key: "all",     label: "All",     count: users.length,  color: "#3b82f6" },
    { key: "active",  label: "Active",  count: activeCount,   color: BULL },
    { key: "blocked", label: "Blocked", count: blockedCount,  color: BEAR },
  ];

  const byFilter = filterMode === "active"
    ? users.filter((u) => !u.blocked)
    : filterMode === "blocked"
    ? users.filter((u) => u.blocked)
    : users;

  const filtered = query.trim()
    ? byFilter.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )
    : byFilter;

  function renderUser({ item: u }: { item: AdminUser }) {
    const pnlColor = u.totalPnl >= 0 ? BULL : BEAR;
    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => router.push({ pathname: "/admin/user-detail", params: { uid: u.uid } })}
        activeOpacity={0.7}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={s.name}>{u.name}</Text>
            {u.blocked && <View style={s.blockedBadge}><Text style={s.blockedText}>BLOCKED</Text></View>}
          </View>
          <Text style={s.email}>{u.email}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <Text style={s.stat}>Trades: <Text style={{ color: FG }}>{u.tradeCount}</Text></Text>
            <Text style={s.stat}>P&L: <Text style={{ color: pnlColor }}>{fmtPnl(u.totalPnl, adminCurrency)}</Text></Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={s.balance}>{fmtBalance(u.balance, adminCurrency)}</Text>
          <SvgIcon name="chevron-forward-outline" size={15} color={MUTED} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Users ({filtered.length})</Text>
        <TouchableOpacity
          style={s.currencyToggle}
          onPress={() => setAdminCurrency((c) => c === "usd" ? "inr" : "usd")}
        >
          <Text style={s.currencyToggleText}>{adminCurrency === "usd" ? "USD" : "INR"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRefresh} style={{ padding: 4 }}>
          <SvgIcon name="refresh-outline" size={18} color={refreshing ? PRIMARY : MUTED} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, filterMode === tab.key && { backgroundColor: tab.color + "22", borderColor: tab.color }]}
            onPress={() => setFilterMode(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, { color: filterMode === tab.key ? tab.color : MUTED }]}>
              {tab.label}
            </Text>
            <View style={[s.tabBadge, { backgroundColor: filterMode === tab.key ? tab.color : MUTED + "44" }]}>
              <Text style={[s.tabBadgeText, { color: filterMode === tab.key ? "#fff" : MUTED }]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.searchWrap}>
        <SvgIcon name="search-outline" size={15} color={MUTED} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email…"
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

      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <SvgIcon name="people-outline" size={40} color={MUTED} />
          <Text style={s.emptyText}>{query ? "No results found" : "No users yet"}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 70 }} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG, flex: 1 },
  tabRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
  },
  tabText: { fontSize: 12, fontWeight: "700" },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: "700" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 14, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, color: FG, fontSize: 14 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: ADMIN_BG,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#3b82f622", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#3b82f6" },
  name: { fontSize: 14, fontWeight: "600", color: FG },
  email: { fontSize: 12, color: MUTED, marginTop: 1 },
  stat: { fontSize: 11, color: MUTED },
  balance: { fontSize: 13, fontWeight: "700", color: PRIMARY },
  blockedBadge: { backgroundColor: BEAR + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  blockedText: { fontSize: 9, fontWeight: "700", color: BEAR, letterSpacing: 0.5 },
  emptyText: { fontSize: 14, color: MUTED },
  currencyToggle: {
    backgroundColor: PRIMARY + "22", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: PRIMARY + "55",
  },
  currencyToggleText: { fontSize: 11, fontWeight: "700" as const, color: PRIMARY },
});
