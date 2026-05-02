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
import { Ionicons } from "@expo/vector-icons";
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

export default function AdminUsers() {
  const insets = useSafeAreaInsets();
  const { users, refreshUsers, isAdmin } = useAdmin();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUsers().finally(() => setLoading(false));
  }, []);

  if (!isAdmin) {
    router.replace("/admin");
    return null;
  }

  const filtered = query.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )
    : users;

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
            <Text style={s.stat}>P&L: <Text style={{ color: pnlColor }}>{u.totalPnl >= 0 ? "+" : ""}₹{Math.abs(u.totalPnl).toFixed(0)}</Text></Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={s.balance}>₹{u.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Text>
          <Ionicons name="chevron-forward-outline" size={15} color={MUTED} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Users ({users.length})</Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={MUTED} />
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
            <Ionicons name="close-outline" size={14} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="people-outline" size={40} color={MUTED} />
          <Text style={s.emptyText}>{query ? "No results found" : "No users yet"}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG },
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
});
