import { router } from "expo-router";
import React, { useEffect } from "react";
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
import { useAdmin } from "@/context/AdminContext";
import { SYMBOLS } from "@/context/TradingContext";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { isAdmin, loading, users, announcements, blockedUids, refreshUsers } = useAdmin();

  useEffect(() => { refreshUsers(); }, []);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: ADMIN_BG }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
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

  const totalTrades  = users.reduce((s, u) => s + u.tradeCount, 0);
  const totalPnl     = users.reduce((s, u) => s + u.totalPnl, 0);
  const activeUsers  = users.filter((u) => !u.blocked).length;
  const blockedCount = blockedUids.length;

  const stats = [
    { label: "Total Users",       value: users.length.toString(),      icon: "users",          color: "#3b82f6" },
    { label: "Active Users",      value: activeUsers.toString(),        icon: "person-add-outline",     color: BULL },
    { label: "Blocked",           value: blockedCount.toString(),       icon: "person-remove-outline",         color: BEAR },
    { label: "Total Trades",      value: totalTrades.toString(),        icon: "activity",       color: "#f59e0b" },
    { label: "Total P&L",         value: `${totalPnl >= 0 ? "+" : ""}₹${Math.abs(totalPnl).toFixed(0)}`, icon: "trending-up-outline", color: totalPnl >= 0 ? BULL : BEAR },
    { label: "Announcements",     value: announcements.filter((a) => a.active).length.toString(), icon: "notifications-outline", color: "#8b5cf6" },
    { label: "Coins Listed",      value: SYMBOLS.length.toString(),     icon: "layers",         color: "#f59e0b" },
  ];

  const menuItems = [
    { label: "Users",          icon: "users",       route: "/admin/users",         color: "#3b82f6", sub: `${users.length} registered` },
    { label: "Coins",          icon: "layers",      route: "/admin/coins",         color: "#f59e0b", sub: `${SYMBOLS.length} listed` },
    { label: "Announcements",  icon: "notifications-outline",        route: "/admin/announcements", color: "#8b5cf6", sub: `${announcements.length} total` },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backIcon}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Admin Panel</Text>
          <Text style={s.headerSub}>Trade Mock Control Center</Text>
        </View>
        <View style={s.adminBadge}>
          <SvgIcon name="shield-outline" size={12} color={PRIMARY} />
          <Text style={s.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Stats grid */}
        <Text style={s.sectionLabel}>OVERVIEW</Text>
        <View style={s.statsGrid}>
          {stats.map((st) => (
            <View key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.color + "22" }]}>
                <SvgIcon name={st.icon as any} size={16} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
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

        {/* Recent users preview */}
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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // Access denied
  deniedTitle: { fontSize: 22, fontWeight: "700", color: FG, marginTop: 12 },
  deniedSub: { fontSize: 14, color: MUTED },
  backBtn: { marginTop: 16, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: "#fff", fontWeight: "700" },

  // Header
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
    marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: PRIMARY + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "700", color: PRIMARY, letterSpacing: 0.5 },

  // Section labels
  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },

  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  statCard: {
    width: "30%", flexGrow: 1, backgroundColor: SURFACE,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, alignItems: "center", gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 10, color: MUTED, textAlign: "center", fontWeight: "500" },

  // Menu list
  menuList: { marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "600", color: FG },
  menuSub: { fontSize: 11, color: MUTED, marginTop: 2 },

  // Badges
  blockedBadge: { backgroundColor: BEAR + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  blockedText: { fontSize: 9, fontWeight: "700", color: BEAR, letterSpacing: 0.5 },
  activeBadge: { backgroundColor: BULL + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeText: { fontSize: 9, fontWeight: "700", color: BULL, letterSpacing: 0.5 },

  // View all
  viewAll: { alignItems: "center", paddingVertical: 14 },
  viewAllText: { color: PRIMARY, fontSize: 14, fontWeight: "600" },
});
