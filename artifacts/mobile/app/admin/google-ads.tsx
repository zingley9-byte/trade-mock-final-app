import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
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
const GOLD     = "#f59e0b";

export default function AdminGoogleAds() {
  const insets = useSafeAreaInsets();
  const { appConfig, updateAppConfig, isAdmin, loading } = useAdmin();
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState("");

  if (!isAdmin && !loading) { router.replace("/admin"); return null; }

  async function toggleAd(key: "bannerAds" | "interstitialAds" | "rewardedAds", val: boolean) {
    setSaving(true);
    try {
      await updateAppConfig({ [key]: val });
    } catch {
      Alert.alert("Error", "Could not update ad setting. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMaintenance(val: boolean) {
    setSaving(true);
    try {
      await updateAppConfig({ maintenanceMode: val });
    } catch {
      Alert.alert("Error", "Could not update setting.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(field: string, currentVal: string) {
    setEditingField(field);
    setTempVal(currentVal);
  }

  async function saveAdUnitId(field: keyof typeof appConfig) {
    if (!tempVal.trim()) { Alert.alert("Error", "Ad Unit ID cannot be empty"); return; }
    setSaving(true);
    try {
      await updateAppConfig({ [field]: tempVal.trim() });
      setEditingField(null);
      Alert.alert("Saved", "Ad Unit ID updated successfully.");
    } catch {
      Alert.alert("Error", "Could not save Ad Unit ID.");
    } finally {
      setSaving(false);
    }
  }

  const adTypes = [
    {
      key: "bannerAds" as const,
      unitKey: "bannerAdUnitId" as const,
      label: "Banner Ads",
      icon: "browsers-outline",
      color: "#3b82f6",
      desc: "Displayed at top/bottom of screens",
      cpm: "$1.20",
      enabled: appConfig.bannerAds,
      unitId: appConfig.bannerAdUnitId,
    },
    {
      key: "interstitialAds" as const,
      unitKey: "interstitialAdUnitId" as const,
      label: "Interstitial Ads",
      icon: "phone-portrait-outline",
      color: "#8b5cf6",
      desc: "Full-screen between screen transitions",
      cpm: "$8.50",
      enabled: appConfig.interstitialAds,
      unitId: appConfig.interstitialAdUnitId,
    },
    {
      key: "rewardedAds" as const,
      unitKey: "rewardedAdUnitId" as const,
      label: "Rewarded Ads",
      icon: "gift-outline",
      color: GOLD,
      desc: "User watches ad to earn bonus",
      cpm: "$12.00",
      enabled: appConfig.rewardedAds,
      unitId: appConfig.rewardedAdUnitId,
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Google Ads</Text>
          <Text style={s.headerSub}>AdMob Configuration</Text>
        </View>
        {saving && <ActivityIndicator color={PRIMARY} size="small" />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        <Text style={s.sectionLabel}>APP SETTINGS</Text>
        <View style={s.menuList}>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.rowIcon, { backgroundColor: "#ef444422" }]}>
              <SvgIcon name="warning-outline" size={18} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Maintenance Mode</Text>
              <Text style={s.rowSub}>Temporarily disable app for all users</Text>
            </View>
            <Switch
              value={appConfig.maintenanceMode}
              onValueChange={toggleMaintenance}
              trackColor={{ false: BORDER, true: "#ef444480" }}
              thumbColor={appConfig.maintenanceMode ? "#ef4444" : MUTED}
            />
          </View>
        </View>

        <Text style={s.sectionLabel}>AD PLACEMENTS</Text>
        {adTypes.map((ad, i) => (
          <View key={ad.key} style={s.adCard}>
            <View style={s.adCardTop}>
              <View style={[s.adIcon, { backgroundColor: ad.color + "22" }]}>
                <SvgIcon name={ad.icon as any} size={20} color={ad.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={s.adLabel}>{ad.label}</Text>
                  <View style={[s.cpmBadge, { backgroundColor: ad.color + "22" }]}>
                    <Text style={[s.cpmText, { color: ad.color }]}>CPM {ad.cpm}</Text>
                  </View>
                </View>
                <Text style={s.adDesc}>{ad.desc}</Text>
              </View>
              <Switch
                value={ad.enabled}
                onValueChange={(v) => toggleAd(ad.key, v)}
                trackColor={{ false: BORDER, true: PRIMARY }}
                thumbColor={ad.enabled ? "#fff" : MUTED}
              />
            </View>

            <View style={s.unitIdRow}>
              <Text style={s.unitIdLabel}>AD UNIT ID</Text>
              {editingField === ad.unitKey ? (
                <View style={s.editRow}>
                  <TextInput
                    style={s.unitIdInput}
                    value={tempVal}
                    onChangeText={setTempVal}
                    placeholder="ca-app-pub-xxxx/yyyy"
                    placeholderTextColor={MUTED}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={s.saveBtn} onPress={() => saveAdUnitId(ad.unitKey)}>
                    <Text style={s.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingField(null)}>
                    <SvgIcon name="close-outline" size={16} color={MUTED} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.unitIdDisplay}
                  onPress={() => startEdit(ad.unitKey, ad.unitId)}
                  activeOpacity={0.7}
                >
                  <Text style={s.unitIdText} numberOfLines={1}>{ad.unitId}</Text>
                  <SvgIcon name="pencil-outline" size={14} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={s.noteCard}>
          <SvgIcon name="information-circle-outline" size={16} color={MUTED} />
          <Text style={s.noteText}>
            Ad toggles control in-app display. Ad Unit IDs must match your Google AdMob account.
            Changes take effect immediately for new ad requests.
          </Text>
        </View>

        <Text style={s.sectionLabel}>HELP</Text>
        <View style={s.menuList}>
          {[
            { label: "AdMob Dashboard",       icon: "analytics-outline",    color: GOLD,      sub: "admob.google.com" },
            { label: "Create Ad Unit",         icon: "add-circle-outline",   color: PRIMARY,   sub: "Add new ad placements" },
            { label: "AdMob Policies",         icon: "shield-checkmark-outline", color: "#3b82f6", sub: "Review ad policies" },
          ].map((item, i) => (
            <View
              key={item.label}
              style={[s.row, i === 2 && { borderBottomWidth: 0 }]}
            >
              <View style={[s.rowIcon, { backgroundColor: item.color + "22" }]}>
                <SvgIcon name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowSub}>{item.sub}</Text>
              </View>
              <SvgIcon name="open-outline" size={14} color={MUTED} />
            </View>
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
  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  menuList: { marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "600", color: FG },
  rowSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  adCard: {
    marginHorizontal: 14, marginBottom: 12, backgroundColor: SURFACE,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden",
  },
  adCardTop: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  adIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  adLabel: { fontSize: 14, fontWeight: "600", color: FG },
  adDesc: { fontSize: 11, color: MUTED, marginTop: 2 },
  cpmBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  cpmText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  unitIdRow: { paddingHorizontal: 14, paddingVertical: 12 },
  unitIdLabel: { fontSize: 10, fontWeight: "700", color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  unitIdDisplay: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitIdText: { flex: 1, fontSize: 12, color: MUTED, fontFamily: "monospace" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitIdInput: {
    flex: 1, backgroundColor: ADMIN_BG, borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, paddingVertical: 8, color: FG, fontSize: 12,
  },
  saveBtn: { backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cancelBtn: { padding: 6 },
  noteCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    marginHorizontal: 14, marginTop: 4,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
});
