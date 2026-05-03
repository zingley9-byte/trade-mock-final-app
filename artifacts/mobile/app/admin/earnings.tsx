import { router } from "expo-router";
import React, { useMemo } from "react";
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

const CPM_BANNER       = 1.2;
const CPM_INTERSTITIAL = 8.5;
const CPM_REWARDED     = 12.0;
const SESSIONS_PER_USER = 3;
const BANNER_SESSIONS   = 0.8;
const INTER_SESSIONS    = 0.3;
const REWARD_SESSIONS   = 0.15;

export default function AdminEarnings() {
  const insets = useSafeAreaInsets();
  const { users, appConfig, isAdmin, loading } = useAdmin();

  const stats = useMemo(() => {
    const totalUsers  = users.filter((u) => !u.blocked).length;
    const totalTrades = users.reduce((s, u) => s + u.tradeCount, 0);
    const totalPnl    = users.reduce((s, u) => s + u.totalPnl, 0);

    const estimatedDailyUsers = Math.max(1, Math.round(totalUsers * 0.4));
    const impressionsBanner       = appConfig.bannerAds      ? estimatedDailyUsers * SESSIONS_PER_USER * 4 * BANNER_SESSIONS : 0;
    const impressionsInterstitial = appConfig.interstitialAds ? estimatedDailyUsers * INTER_SESSIONS : 0;
    const impressionsRewarded     = appConfig.rewardedAds    ? estimatedDailyUsers * REWARD_SESSIONS : 0;

    const revBanner       = (impressionsBanner       / 1000) * CPM_BANNER;
    const revInterstitial = (impressionsInterstitial  / 1000) * CPM_INTERSTITIAL;
    const revRewarded     = (impressionsRewarded      / 1000) * CPM_REWARDED;
    const totalRevDay     = revBanner + revInterstitial + revRewarded;
    const totalRevMonth   = totalRevDay * 30;

    return {
      totalUsers, totalTrades, totalPnl, estimatedDailyUsers,
      impressionsBanner: Math.round(impressionsBanner),
      impressionsInterstitial: Math.round(impressionsInterstitial),
      impressionsRewarded: Math.round(impressionsRewarded),
      revBanner, revInterstitial, revRewarded,
      totalRevDay, totalRevMonth,
    };
  }, [users, appConfig]);

  if (!isAdmin && !loading) { router.replace("/admin"); return null; }

  function fmt(n: number) { return `$${n.toFixed(2)}`; }
  function fmtInr(n: number) { return `₹${(n * 84).toFixed(0)}`; }

  const adBreakdown = [
    {
      label: "Banner Ads",
      icon: "browsers-outline",
      color: "#3b82f6",
      impressions: stats.impressionsBanner,
      cpm: CPM_BANNER,
      rev: stats.revBanner,
      active: appConfig.bannerAds,
    },
    {
      label: "Interstitial Ads",
      icon: "phone-portrait-outline",
      color: "#8b5cf6",
      impressions: stats.impressionsInterstitial,
      cpm: CPM_INTERSTITIAL,
      rev: stats.revInterstitial,
      active: appConfig.interstitialAds,
    },
    {
      label: "Rewarded Ads",
      icon: "gift-outline",
      color: GOLD,
      impressions: stats.impressionsRewarded,
      cpm: CPM_REWARDED,
      rev: stats.revRewarded,
      active: appConfig.rewardedAds,
    },
  ];

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
        <View style={[s.liveBadge]}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>ESTIMATED</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        <Text style={s.sectionLabel}>TODAY'S ESTIMATE</Text>
        <View style={s.revenueCard}>
          <Text style={s.revLabel}>Daily Ad Revenue</Text>
          <Text style={s.revBig}>{fmt(stats.totalRevDay)}</Text>
          <Text style={s.revInr}>{fmtInr(stats.totalRevDay)} / day</Text>
          <View style={s.divider} />
          <View style={s.revRow}>
            <View style={s.revSub}>
              <Text style={s.revSubVal}>{fmt(stats.totalRevMonth)}</Text>
              <Text style={s.revSubLabel}>Monthly Est.</Text>
            </View>
            <View style={[s.revSub, { borderLeftWidth: 1, borderLeftColor: BORDER }]}>
              <Text style={s.revSubVal}>{fmt(stats.totalRevMonth * 12)}</Text>
              <Text style={s.revSubLabel}>Yearly Est.</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionLabel}>USER ACTIVITY</Text>
        <View style={s.statsGrid}>
          {[
            { label: "Total Users",    value: stats.totalUsers.toString(),          color: "#3b82f6", icon: "people-outline" },
            { label: "Daily Active",   value: stats.estimatedDailyUsers.toString(), color: BULL,      icon: "pulse-outline" },
            { label: "Total Trades",   value: stats.totalTrades.toString(),         color: GOLD,      icon: "swap-horizontal-outline" },
            { label: "Total P&L",      value: `${stats.totalPnl >= 0 ? "+" : ""}₹${Math.abs(stats.totalPnl / 1000).toFixed(0)}K`, color: stats.totalPnl >= 0 ? BULL : BEAR, icon: "trending-up-outline" },
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

        <Text style={s.sectionLabel}>AD BREAKDOWN</Text>
        <View style={s.menuList}>
          {adBreakdown.map((ad, i) => (
            <View key={ad.label} style={[s.adRow, i === adBreakdown.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.adIcon, { backgroundColor: ad.color + "22" }]}>
                <SvgIcon name={ad.icon as any} size={18} color={ad.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.adLabel}>{ad.label}</Text>
                  <View style={[s.statusDot, { backgroundColor: ad.active ? BULL : MUTED }]} />
                </View>
                <Text style={s.adSub}>
                  {ad.impressions.toLocaleString()} impressions · CPM ${ad.cpm.toFixed(2)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.adRev, { color: ad.active ? ad.color : MUTED }]}>{fmt(ad.rev)}</Text>
                <Text style={s.adRevInr}>{fmtInr(ad.rev)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.noteCard}>
          <SvgIcon name="information-circle-outline" size={16} color={MUTED} />
          <Text style={s.noteText}>
            Revenue estimates are based on average CPM rates and your current user count.
            Actual earnings depend on your AdMob account, geo, and fill rates.
          </Text>
        </View>

        <Text style={s.sectionLabel}>QUICK LINKS</Text>
        <View style={s.menuList}>
          {[
            { label: "Google AdMob Console", icon: "open-outline", color: GOLD, sub: "View real earnings in AdMob" },
            { label: "Firebase Analytics",   icon: "bar-chart-outline",  color: "#3b82f6", sub: "User engagement metrics" },
            { label: "Google Ads Settings",  icon: "settings-outline",    color: "#8b5cf6", sub: "Manage ad placements", route: "/admin/google-ads" },
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
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: GOLD + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  liveText: { fontSize: 9, fontWeight: "700", color: GOLD, letterSpacing: 0.5 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  revenueCard: {
    marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: "center",
  },
  revLabel: { fontSize: 12, color: MUTED, fontWeight: "600", letterSpacing: 0.5 },
  revBig: { fontSize: 42, fontWeight: "800", color: BULL, marginTop: 4 },
  revInr: { fontSize: 14, color: MUTED, marginTop: 2 },
  divider: { width: "100%", height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 16 },
  revRow: { flexDirection: "row", width: "100%" },
  revSub: { flex: 1, alignItems: "center", gap: 4 },
  revSubVal: { fontSize: 18, fontWeight: "700", color: FG },
  revSubLabel: { fontSize: 11, color: MUTED },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  statCard: {
    width: "46%", flexGrow: 1, backgroundColor: SURFACE,
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
  adRev: { fontSize: 15, fontWeight: "700" },
  adRevInr: { fontSize: 11, color: MUTED, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  noteCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    marginHorizontal: 14, marginTop: 12,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
});
