import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PositionSnapshot, useAdmin } from "@/context/AdminContext";
import { SYMBOLS } from "@/context/TradingContext";


const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";
const GOLD     = "#f59e0b";

const USD_TO_INR = 95;

function calcPosPnl(pos: PositionSnapshot, price: number): number {
  if (!price || price <= 0) return 0;
  const entry = parseFloat(String(pos.entryPrice));
  const qty   = parseFloat(String(pos.quantity));
  if (!entry || !qty) return 0;
  return pos.side === "buy" ? (price - entry) * qty : (entry - price) * qty;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { isAdmin, loading, users, usersError, announcements, blockedUids, refreshUsers, appConfig, customCoins } = useAdmin();
  const [symbolPrices, setSymbolPrices] = useState<Record<string, number>>({});

  useEffect(() => { refreshUsers(); }, []);

  // Fetch live prices every 5 s — used for unrealized PNL of all open positions
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res  = await fetch("/api/market/prices");
        const map: Record<string, { price: number }> = await res.json();
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(map)) {
          if (v?.price > 0) next[k] = v.price;
        }
        setSymbolPrices(next);
      } catch {}
    }
    fetchPrices();
    const iv = setInterval(fetchPrices, 5000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: ADMIN_BG }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
        <Text style={{ color: MUTED, marginTop: 12, fontSize: 13 }}>Loading admin panel…</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[s.center, { backgroundColor: ADMIN_BG }]}>
        <SvgIcon name="lock-closed-outline" size={48} color={BEAR} />
        <Text style={s.deniedTitle}>Access Denied</Text>
        <Text style={s.deniedSub}>You don't have admin privileges.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active = users who have actually traded (open or closed), not just registered
  const activeUsers       = users.filter((u) => u.tradeCount > 0 || (u.openPositions?.length ?? 0) > 0).length;
  const blockedCount      = blockedUids.length;
  const totalClosedTrades = users.reduce((s, u) => s + u.tradeCount, 0);
  const totalOpenTrades   = users.reduce((s, u) => s + (u.openPositions?.length ?? 0), 0);

  // Realized PNL = sum of all closed trade PNLs stored per user in Firestore (USD)
  const realizedPnlUsd = users.reduce((s, u) => s + u.totalPnl, 0);
  // Unrealized PNL = live formula over all open positions × current market price (USD)
  const unrealizedPnlUsd = users.reduce(
    (s, u) => s + (u.openPositions ?? []).reduce(
      (ps, pos) => ps + calcPosPnl(pos, symbolPrices[pos.symbolId] ?? 0), 0
    ), 0
  );
  const totalPnlInr = (realizedPnlUsd + unrealizedPnlUsd) * USD_TO_INR;

  // Per-user combined PNL to classify profit vs loss users
  const profitUsers = users.filter((u) => {
    const unreal = (u.openPositions ?? []).reduce((ps, pos) => ps + calcPosPnl(pos, symbolPrices[pos.symbolId] ?? 0), 0);
    return (u.totalPnl + unreal) > 0;
  }).length;
  const lossUsers = users.filter((u) => {
    const unreal = (u.openPositions ?? []).reduce((ps, pos) => ps + calcPosPnl(pos, symbolPrices[pos.symbolId] ?? 0), 0);
    return (u.totalPnl + unreal) < 0;
  }).length;

  const pnlStr = `${totalPnlInr >= 0 ? "+" : ""}₹${Math.abs(totalPnlInr / 1000).toFixed(1)}K`;

  const stats = [
    { label: "Total Users",    value: users.length.toString(),         icon: "people-outline",            color: "#3b82f6", route: "/admin/users" },
    { label: "Active",         value: activeUsers.toString(),           icon: "person-add-outline",        color: BULL,      route: "/admin/users?filter=active" },
    { label: "Blocked",        value: blockedCount.toString(),          icon: "person-remove-outline",     color: BEAR,      route: "/admin/users?filter=blocked" },
    { label: "Open Trades",    value: totalOpenTrades.toString(),       icon: "pulse-outline",             color: "#3b82f6", route: "/admin/trades" },
    { label: "Closed Trades",  value: totalClosedTrades.toString(),     icon: "swap-horizontal-outline",   color: GOLD,      route: "/admin/trades" },
    { label: "Total P&L",      value: pnlStr,                           icon: "trending-up-outline",       color: totalPnlInr >= 0 ? BULL : BEAR, route: null },
    { label: "Profit Users",   value: profitUsers.toString(),           icon: "arrow-up-circle-outline",   color: BULL,      route: null },
    { label: "Loss Users",     value: lossUsers.toString(),             icon: "arrow-down-circle-outline", color: BEAR,      route: null },
    { label: "Announcements",  value: announcements.filter((a) => a.active).length.toString(), icon: "notifications-outline", color: "#8b5cf6", route: "/admin/announcements" },
    { label: "Coins Listed",   value: (SYMBOLS.length + customCoins.length).toString(), icon: "layers-outline", color: GOLD, route: "/admin/coins" },
  ];

  const menuItems = [
    { label: "Users",          icon: "people-outline",          route: "/admin/users",         color: "#3b82f6", sub: `${users.length} registered` },
    { label: "Earnings",       icon: "cash-outline",            route: "/admin/earnings",      color: BULL,      sub: "Revenue & ad performance" },
    { label: "Google Ads",     icon: "megaphone-outline",       route: "/admin/google-ads",    color: GOLD,      sub: `${[appConfig.bannerAds, appConfig.interstitialAds, appConfig.rewardedAds].filter(Boolean).length}/3 active` },
    { label: "Announcements",  icon: "notifications-outline",   route: "/admin/announcements", color: "#8b5cf6", sub: `${announcements.length} total` },
    { label: "Coins",          icon: "layers-outline",          route: "/admin/coins",         color: "#f59e0b", sub: `${SYMBOLS.length} listed` },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backIcon}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Admin Panel</Text>
          <Text style={s.headerSub}>Trade Mock Pro Control Center</Text>
        </View>
        <View style={s.adminBadge}>
          <SvgIcon name="shield-checkmark-outline" size={12} color={PRIMARY} />
          <Text style={s.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {appConfig.maintenanceMode && (
          <View style={s.maintenanceBanner}>
            <SvgIcon name="warning-outline" size={16} color="#fbbf24" />
            <Text style={s.maintenanceText}>Maintenance Mode is ON — app is disabled for users</Text>
          </View>
        )}

        {!!usersError && (
          <View style={s.permErrBanner}>
            <SvgIcon name="alert-circle-outline" size={15} color={BEAR} />
            <Text style={s.permErrText}>{usersError}</Text>
          </View>
        )}

        <Text style={s.sectionLabel}>OVERVIEW</Text>
        <View style={s.statsGrid}>
          {stats.map((st) => (
            <TouchableOpacity
              key={st.label}
              style={s.statCard}
              onPress={() => st.route && router.push(st.route as any)}
              activeOpacity={st.route ? 0.7 : 1}
            >
              <View style={[s.statIcon, { backgroundColor: st.color + "22" }]}>
                <SvgIcon name={st.icon as any} size={16} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
              {!!st.route && (
                <SvgIcon name="chevron-forward-outline" size={11} color={st.color + "99"} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>MANAGE</Text>
        <View style={s.menuList}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, i === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[s.menuIcon, { backgroundColor: item.color + "22" }]}>
                <SvgIcon name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
            </TouchableOpacity>
          ))}
        </View>

        {users.length > 0 && (
          <>
            <Text style={s.sectionLabel}>RECENT USERS</Text>
            <View style={s.menuList}>
              {users.slice(0, 5).map((u, i) => (
                <TouchableOpacity
                  key={u.uid}
                  style={[s.menuRow, i === Math.min(users.length, 5) - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({ pathname: "/admin/user-detail", params: { uid: u.uid } })}
                  activeOpacity={0.7}
                >
                  <View style={[s.menuIcon, { backgroundColor: "#3b82f622" }]}>
                    <Text style={{ fontSize: 16 }}>{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>{u.name}</Text>
                    <Text style={s.menuSub}>{u.email}</Text>
                  </View>
                  {u.blocked ? (
                    <View style={s.blockedBadge}><Text style={s.blockedText}>BLOCKED</Text></View>
                  ) : (
                    <View style={s.activeBadge}><Text style={s.activeText}>ACTIVE</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.viewAll} onPress={() => router.push("/admin/users")}>
              <Text style={s.viewAllText}>View All Users →</Text>
            </TouchableOpacity>
          </>
        )}

        {users.length === 0 && (
          <View style={s.emptyUsers}>
            <SvgIcon name="people-outline" size={40} color={MUTED} />
            <Text style={s.emptyTitle}>No users yet</Text>
            <Text style={s.emptySub}>Users will appear here after they sign up and open the app</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 22, fontWeight: "700", color: "#f1f5f9", marginTop: 12 },
  deniedSub: { fontSize: 14, color: MUTED },
  backBtn: { marginTop: 16, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: "#fff", fontWeight: "700" },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  backIcon: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: PRIMARY + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: PRIMARY, letterSpacing: 0.5 },
  maintenanceBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 14, backgroundColor: "#78350f33", borderRadius: 12,
    borderWidth: 1, borderColor: "#92400e", padding: 12,
  },
  maintenanceText: { flex: 1, color: "#fbbf24", fontSize: 13, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  statCard: {
    width: "30%", flexGrow: 1, backgroundColor: SURFACE,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, alignItems: "center", gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 10, color: MUTED, textAlign: "center", fontWeight: "500" },
  menuList: { marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "600", color: FG },
  menuSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  blockedBadge: { backgroundColor: BEAR + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  blockedText: { fontSize: 9, fontWeight: "700", color: BEAR, letterSpacing: 0.5 },
  activeBadge: { backgroundColor: BULL + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeText: { fontSize: 9, fontWeight: "700", color: BULL, letterSpacing: 0.5 },
  viewAll: { alignItems: "center", paddingVertical: 14 },
  viewAllText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
  emptyUsers: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: MUTED },
  emptySub: { fontSize: 12, color: MUTED, textAlign: "center", maxWidth: 260, lineHeight: 18 },
  permErrBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    margin: 14, backgroundColor: "#ff4d4d18", borderRadius: 12,
    borderWidth: 1, borderColor: "#ff4d4d44", padding: 12,
  },
  permErrText: { flex: 1, color: BEAR, fontSize: 12, lineHeight: 17 },
});
