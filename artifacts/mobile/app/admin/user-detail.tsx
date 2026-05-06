import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function UserDetail() {
  const insets = useSafeAreaInsets();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const {
    users, blockedUids, blockUser, unblockUser,
    addFakeBalance, resetUserFund,
    isAdmin, loading: authLoading,
  } = useAdmin();
  const [balanceModal, setBalanceModal] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  if (authLoading) {
    return (
      <View style={[s.center, { backgroundColor: ADMIN_BG }]}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAdmin) { router.replace("/admin"); return null; }

  const user = users.find((u) => u.uid === uid);
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: ADMIN_BG }]}>
        <SvgIcon name="person-remove-outline" size={40} color={MUTED} />
        <Text style={{ color: MUTED, marginTop: 8 }}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBlocked = blockedUids.includes(user.uid);
  const pnlColor  = user.totalPnl >= 0 ? BULL : BEAR;
  const lastSeen  = user.lastSeen ? new Date(user.lastSeen).toLocaleString("en-IN") : "N/A";

  function handleBlock() {
    Alert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked
        ? `Unblock ${user!.name}? They will regain access.`
        : `Block ${user!.name}? They won't be able to trade.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              if (isBlocked) await unblockUser(user!.uid);
              else await blockUser(user!.uid);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleAddBalance() {
    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    setActionLoading(true);
    try {
      await addFakeBalance(user!.uid, amt);
      setBalanceModal(false);
      setAmountInput("");
      Alert.alert("Done", `₹${amt.toLocaleString()} added to ${user!.name}'s account.`);
    } catch {
      Alert.alert("Error", "Could not add balance. Try again.");
    } finally {
      setActionLoading(false);
    }
  }

  function handleFundReset() {
    Alert.alert(
      "Reset Fund",
      `Reset ${user!.name}'s account to $50,000?\n\nThis will clear their trade history and P&L. Takes effect when they reopen the app.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Fund",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await resetUserFund(user!.uid);
              Alert.alert("Fund Reset", `${user!.name}'s balance reset to $50,000.\n\nChange will apply when they reopen the app.`);
            } catch {
              Alert.alert("Error", "Could not reset fund. Try again.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  const stats = [
    { label: "Current Balance",  value: `₹${user.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, color: PRIMARY },
    { label: "Total Trades",     value: user.tradeCount.toString(),   color: FG },
    { label: "Total P&L",        value: `${user.totalPnl >= 0 ? "+" : ""}₹${Math.abs(user.totalPnl).toFixed(0)}`, color: pnlColor },
    { label: "Joined",           value: new Date(user.createdAt).toLocaleDateString("en-IN"), color: MUTED },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Detail</Text>
        {actionLoading && <ActivityIndicator color={PRIMARY} size="small" />}
        {!actionLoading && isBlocked && (
          <View style={s.blockedBadge}><Text style={s.blockedText}>BLOCKED</Text></View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.userName}>{user.name}</Text>
          <Text style={s.userEmail}>{user.email}</Text>
          <Text style={s.userId}>UID: {user.uid.slice(0, 16)}…</Text>
          <Text style={s.lastSeen}>Last seen: {lastSeen}</Text>
          {(user.fakeBalanceAdded ?? 0) > 0 && (
            <View style={s.fakeBonusBadge}>
              <SvgIcon name="gift-outline" size={11} color={GOLD} />
              <Text style={s.fakeBonusText}>+₹{(user.fakeBalanceAdded ?? 0).toLocaleString("en-IN")} admin bonus</Text>
            </View>
          )}
        </View>

        <Text style={s.sectionLabel}>ACCOUNT STATS</Text>
        <View style={s.statsGrid}>
          {stats.map((st) => (
            <View key={st.label} style={s.statCard}>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionLabel}>ACTIONS</Text>
        <View style={s.actionList}>

          <TouchableOpacity style={s.actionRow} onPress={() => setBalanceModal(true)} activeOpacity={0.7}>
            <View style={[s.actionIcon, { backgroundColor: "#22c55e22" }]}>
              <SvgIcon name="add-circle-outline" size={18} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionLabel}>Add Fake Balance</Text>
              <Text style={s.actionSub}>Add virtual money to this account</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
          </TouchableOpacity>

          <TouchableOpacity style={s.actionRow} onPress={handleFundReset} activeOpacity={0.7}>
            <View style={[s.actionIcon, { backgroundColor: GOLD + "22" }]}>
              <SvgIcon name="refresh-circle-outline" size={18} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionLabel, { color: GOLD }]}>Reset Fund</Text>
              <Text style={s.actionSub}>Reset balance to $50,000 · clears history</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionRow}
            onPress={() => router.push({ pathname: "/admin/user-trades", params: { uid: user.uid, name: user.name } })}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: "#3b82f622" }]}>
              <SvgIcon name="swap-horizontal-outline" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionLabel, { color: "#3b82f6" }]}>Trade History</Text>
              <Text style={s.actionSub}>{user.tradeCount} trades · view dates & details</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleBlock}
            activeOpacity={0.7}
          >
            <View style={[s.actionIcon, { backgroundColor: isBlocked ? "#22c55e22" : BEAR + "22" }]}>
              <SvgIcon name={isBlocked ? "person-add-outline" : "person-remove-outline"} size={18} color={isBlocked ? "#22c55e" : BEAR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.actionLabel, { color: isBlocked ? "#22c55e" : BEAR }]}>
                {isBlocked ? "Unblock User" : "Block User"}
              </Text>
              <Text style={s.actionSub}>
                {isBlocked ? "Restore access to this user" : "Prevent this user from trading"}
              </Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={MUTED} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={balanceModal} transparent animationType="slide" onRequestClose={() => setBalanceModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setBalanceModal(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Add Fake Balance</Text>
          <Text style={s.sheetSub}>Adding to: {user.name}</Text>
          <Text style={s.sheetCurrentBal}>Current: ₹{user.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          <TextInput
            style={s.amountInput}
            placeholder="Enter amount (₹)"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            value={amountInput}
            onChangeText={setAmountInput}
          />
          <View style={s.presetRow}>
            {[10000, 50000, 100000, 500000].map((amt) => (
              <TouchableOpacity key={amt} style={s.preset} onPress={() => setAmountInput(amt.toString())}>
                <Text style={s.presetText}>₹{(amt / 1000).toFixed(0)}K</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={s.confirmBtn} onPress={handleAddBalance} activeOpacity={0.85} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <SvgIcon name="add-outline" size={16} color="#fff" />
                <Text style={s.confirmText}>Add Balance</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ADMIN_BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG, flex: 1 },
  backBtn: { marginTop: 12, backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: "#fff", fontWeight: "700" },
  profileCard: {
    margin: 16, backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 24, alignItems: "center", gap: 4,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#3b82f622", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 30, fontWeight: "700", color: "#3b82f6" },
  userName: { fontSize: 20, fontWeight: "700", color: FG },
  userEmail: { fontSize: 13, color: MUTED },
  userId: { fontSize: 10, color: MUTED, marginTop: 4 },
  lastSeen: { fontSize: 11, color: MUTED, marginTop: 2 },
  fakeBonusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8,
    backgroundColor: GOLD + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  fakeBonusText: { fontSize: 11, color: GOLD, fontWeight: "600" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 14 },
  statCard: {
    flex: 1, minWidth: "44%", backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 16, gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, color: MUTED },
  actionList: { marginHorizontal: 14, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  actionRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 14, fontWeight: "600", color: FG },
  actionSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  blockedBadge: { backgroundColor: BEAR + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  blockedText: { fontSize: 10, fontWeight: "700", color: BEAR, letterSpacing: 0.5 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 20, paddingBottom: 40,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginTop: 10, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: FG, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: MUTED, marginBottom: 2 },
  sheetCurrentBal: { fontSize: 13, color: PRIMARY, marginBottom: 16 },
  amountInput: {
    backgroundColor: ADMIN_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14, color: FG, fontSize: 16, marginBottom: 12,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  preset: { flex: 1, backgroundColor: ADMIN_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingVertical: 10, alignItems: "center" },
  presetText: { color: PRIMARY, fontSize: 13, fontWeight: "700" },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
