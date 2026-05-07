import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { SYMBOLS } from "@/context/TradingContext";
import { CustomCoin, useAdmin } from "@/context/AdminContext";
import CoinLogo from "@/components/CoinLogo";

const ADMIN_BG = "#0a0e1a";
const SURFACE  = "#111827";
const BORDER   = "#1e293b";
const PRIMARY  = "#00c896";
const MUTED    = "#64748b";
const FG       = "#f1f5f9";
const BEAR     = "#ff4d4d";

export default function AdminCoins() {
  const insets = useSafeAreaInsets();
  const { isAdmin, loading: authLoading, customCoins, addCustomCoin, removeCustomCoin } = useAdmin();
  const [query, setQuery]       = useState("");
  const [addModal, setAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: ADMIN_BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!isAdmin) { router.replace("/admin"); return null; }

  const allCoins = [
    ...SYMBOLS.map((s) => ({ ...s, isDefault: true })),
    ...(customCoins as CustomCoin[]).map((c) => ({ ...c, type: "crypto" as const, isDefault: false })),
  ];

  const filtered = query.trim()
    ? allCoins.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase())
      )
    : allCoins;

  async function handleAdd() {
    const rawSym = newSymbol.trim().toUpperCase().replace(/\//g, "").replace(/\s/g, "");
    const nm     = newName.trim();
    if (!rawSym || !nm) { Alert.alert("Error", "Fill both fields"); return; }
    // Normalize: strip USDT suffix for display, always use XXXUSDT as id
    const base  = rawSym.endsWith("USDT") ? rawSym.slice(0, -4) : rawSym;
    const id    = base + "USDT";
    const label = base + "/USDT";

    if (allCoins.find((c) => c.id === id)) {
      Alert.alert("Already Listed", `${label} is already in the coin list.`);
      return;
    }

    setAdding(true);
    try {
      // Validate symbol exists on Binance via our API proxy
      const res = await fetch(`/api/market/ticker24hr?symbol=${id}`);
      if (!res.ok) throw new Error(`Symbol ${label} not found on Binance (HTTP ${res.status})`);
      const data = await res.json();
      if (!data?.lastPrice && !data?.symbol) throw new Error(`Symbol ${label} not supported`);

      await addCustomCoin({ id, name: nm, label });
      setAddModal(false);
      setNewSymbol("");
      setNewName("");
      Alert.alert("Added", `${nm} (${label}) added successfully.\nLive market data will be used automatically.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Cannot Add Coin", msg);
    } finally {
      setAdding(false);
    }
  }

  function handleRemove(id: string, name: string) {
    if (SYMBOLS.find((s) => s.id === id)) {
      Alert.alert("Cannot Remove", "Built-in coins cannot be removed from this panel.\nThey are part of the core app.");
      return;
    }
    Alert.alert("Remove Coin", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeCustomCoin(id).catch(() => Alert.alert("Error", "Could not remove coin.")) },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <SvgIcon name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Coins ({allCoins.length})</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setAddModal(true)}
        >
          <SvgIcon name="add-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <SvgIcon name="search-outline" size={15} color={MUTED} />
        <TextInput
          style={s.searchInput}
          placeholder="Search coins…"
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

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 68 }} />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <CoinLogo symbolId={item.id} size={38} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.coinLabel}>{item.label}</Text>
                {!(item as any).isDefault && (
                  <View style={s.customBadge}><Text style={s.customText}>CUSTOM</Text></View>
                )}
              </View>
              <Text style={s.coinName}>{item.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemove(item.id, item.name)}
              style={s.removeBtn}
            >
              <SvgIcon name="trash-outline" size={16} color={(item as any).isDefault ? MUTED : BEAR} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Coin Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setAddModal(false)} />
          <View style={s.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={s.handle} />
              <Text style={s.sheetTitle}>Add New Coin</Text>
              <Text style={s.fieldLabel}>SYMBOL (e.g. BTC or BTCUSDT)</Text>
              <TextInput
                style={s.input}
                placeholder="Symbol"
                placeholderTextColor={MUTED}
                value={newSymbol}
                onChangeText={setNewSymbol}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
              />
              <Text style={s.fieldLabel}>COIN NAME</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Bitcoin"
                placeholderTextColor={MUTED}
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <View style={s.validationNote}>
                <SvgIcon name="information-circle-outline" size={13} color={MUTED} />
                <Text style={s.noteText}>Symbol will be validated against Binance before adding</Text>
              </View>
              <TouchableOpacity
                style={[s.confirmBtn, adding && { opacity: 0.7 }]}
                onPress={handleAdd}
                activeOpacity={0.85}
                disabled={adding}
              >
                {adding
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><SvgIcon name="add-outline" size={16} color="#fff" /><Text style={s.confirmText}>Add Coin</Text></>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: FG, flex: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 14, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, color: FG, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  coinLabel: { fontSize: 14, fontWeight: "600", color: FG },
  coinName: { fontSize: 12, color: MUTED, marginTop: 2 },
  removeBtn: { padding: 8 },
  customBadge: { backgroundColor: "#f59e0b22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  customText: { fontSize: 9, fontWeight: "700", color: "#f59e0b", letterSpacing: 0.5 },
  sheet: {
    maxHeight: "90%",
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 20, paddingBottom: 40,
  },
  validationNote: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, opacity: 0.7 },
  noteText: { fontSize: 11, color: MUTED, flex: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginTop: 10, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: FG, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: ADMIN_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14, color: FG, fontSize: 15, marginBottom: 14,
  },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
