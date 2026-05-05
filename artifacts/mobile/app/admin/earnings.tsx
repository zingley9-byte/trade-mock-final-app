import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAdmin } from "@/context/AdminContext";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";
const BULL     = "#00c896";
const GOLD     = "#f59e0b";

export default function AdminEarnings() {
  const insets = useSafeAreaInsets();
  const { users, isAdmin, loading } = useAdmin();

  if (!isAdmin && !loading) { router.replace("/admin"); return null; }

  const totalUsers  = users.filter((u) => !u.blocked).length;
  const totalTrades = users.reduce((s, u) => s + u.tradeCount, 0);
  const totalPnl    = users.reduce((s, u) => s + u.totalPnl, 0);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Earnings</Text>
          <Text style={s.headerSub}>Revenue & Ad Performance</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* AdMob not connected banner */}
        <View style={s.notConnectedCard}>
          <View style={s.notConnectedIcon}>
            <SvgIcon name="wifi-outline" size={32} color={MUTED} />
          </View>
          <Text style={s.notConnectedTitle}>AdMob not connected</Text>
          <Text style={s.notConnectedSub}>Revenue data not available</Text>
          <Text style={s.notConnectedDesc}>
            Connect your AdMob account to see real earnings, impressions, CPM, and fill rates.
          </Text>
        </View>

        {/* Ad type placeholders */}
        <Text style={s.sectionLabel}>AD UNITS</Text>
        <View style={s.menuList}>
          {[
            { label: "Banner Ads",       icon: "browsers-outline",       color: "#3b82f6" },
            { label: "Interstitial Ads", icon: "phone-portrait-outline", color: "#8b5cf6" },
            { label: "Rewarded Ads",     icon: "gift-outline",           color: GOLD },
          ].map((ad, i) => (
            <View key={ad.label} style={[s.adRow, i === 2 && { borderBottomWidth: 0 }]}>
              <View style={[s.adIcon, { backgroundColor: ad.color + "22" }]}>
                <SvgIcon name={ad.icon as any} size={18} color={ad.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.adLabel}>{ad.label}</Text>
                <Text style={s.adSub}>Revenue data not available</Text>
              </View>
              <Text style={s.naText}>N/A</Text>
            </View>
          ))}
        </View>

        {/* Real user activity — no fake numbers */}
        <Text style={s.sectionLabel}>USER ACTIVITY</Text>
        <View style={s.statsGrid}>
          {[
            { label: "Total Users",  value: totalUsers.toString(),  color: "#3b82f6", icon: "people-outline" },
            { label: "Total Trades", value: totalTrades.toString(), color: GOLD,      icon: "swap-horizontal-outline" },
            { label: "Total P&L",    value: `${totalPnl >= 0 ? "+" : ""}₹${Math.abs(totalPnl / 1000).toFixed(0)}K`, color: totalPnl >= 0 ? BULL : BEAR, icon: "trending-up-outline" },
          ].map((st) => (
            <View key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.color + "22" }]}>
                <SvgIcon name={st.icon as any} size={16} color={st.color} />
              </View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Links */}
        <Text style={s.sectionLabel}>QUICK LINKS</Text>
        <View style={s.menuList}>
          {[
            { label: "Google AdMob Console", icon: "open-outline",      color: GOLD,      sub: "Connect to see real earnings" },
            { label: "Firebase Analytics",   icon: "bar-chart-outline", color: "#3b82f6", sub: "User engagement metrics" },
            { label: "Google Ads Settings",  icon: "settings-outline",  color: "#8b5cf6", sub: "Manage ad placements", route: "/admin/google-ads" },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.adRow, i === 2 && { borderBottomWidth: 0 }]}
              onPress={() => item.route ? router.push(item.route as any) : undefined}
              activeOpacity={0.7}
            >
              <View style={[s.adIcon, { backgroundColor: item.color + "22" }]}>
                <SvgIcon name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.adLabel}>{item.label}</Text>
                <Text style={s.adSub}>{item.sub}</Text>
              </View>
              <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  notConnectedCard: {
    margin: 16, backgroundColor: SURFACE,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 28, alignItems: "center", gap: 6,
  },
  notConnectedIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: MUTED + "18",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  notConnectedTitle: { fontSize: 18, fontWeight: "700", color: FG },
  notConnectedSub: { fontSize: 13, color: MUTED, fontWeight: "600" },
  notConnectedDesc: {
    fontSize: 12, color: MUTED, textAlign: "center",
    marginTop: 6, lineHeight: 18, maxWidth: 280,
  },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  statCard: {
    flexGrow: 1, minWidth: "30%", backgroundColor: SURFACE,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, alignItems: "center", gap: 6,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 10, color: MUTED, textAlign: "center", fontWeight: "500" },

  menuList: { marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  adRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  adIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adLabel: { fontSize: 14, fontWeight: "600", color: FG },
  adSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  naText: { fontSize: 13, fontWeight: "600", color: MUTED },
});
