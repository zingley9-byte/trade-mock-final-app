import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SYMBOLS } from "@/context/TradingContext";
import { useAdmin } from "@/context/AdminContext";
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
  const { isAdmin } = useAdmin();
  const [query, setQuery] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [customCoins, setCustomCoins] = useState<{ id: string; name: string; label: string }[]>([]);

  if (!isAdmin) { router.replace("/admin"); return null; }

  const allCoins = [
    ...SYMBOLS.map((s) => ({ ...s, isDefault: true })),
    ...customCoins.map((c) => ({ ...c, type: "crypto" as const, isDefault: false })),
  ];

  const filtered = query.trim()
    ? allCoins.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase())
      )
    : allCoins;

  function handleAdd() {
    const sym = newSymbol.trim().toUpperCase();
    const nm  = newName.trim();
    if (!sym || !nm) { Alert.alert("Error", "Fill both fields"); return; }
    const id = sym.endsWith("USDT") ? sym : sym + "USDT";
    if (allCoins.find((c) => c.id === id)) { Alert.alert("Exists", "This coin is already listed"); return; }
    setCustomCoins((prev) => [...prev, { id, name: nm, label: sym.replace("USDT", "") + "/USDT" }]);
    setAddModal(false);
    setNewSymbol("");
    setNewName("");
    Alert.alert("Added", `${nm} (${sym}) added successfully.`);
  }

  function handleRemove(id: string, name: string) {
    const isDefault = SYMBOLS.find((s) => s.id === id);
    if (isDefault) {
      Alert.alert("Cannot Remove", "Default coins cannot be removed from this panel.\nThey are hardcoded in the app.");
      return;
    }
    Alert.alert("Remove Coin", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setCustomCoins((prev) => prev.filter((c) => c.id !== id)) },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back-outline" size={20} color={FG} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Coins ({allCoins.length})</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setAddModal(true)}
        >
          <Ionicons name="add-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color={MUTED} />
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
            <Ionicons name="close-outline" size={14} color={MUTED} />
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
              <Ionicons name="trash-outline" size={16} color={(item as any).isDefault ? MUTED : BEAR} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Coin Modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setAddModal(false)} />
        <View style={s.sheet}>
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
          />
          <Text style={s.fieldLabel}>COIN NAME</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Bitcoin"
            placeholderTextColor={MUTED}
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
          />
          <TouchableOpacity style={s.confirmBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Ionicons name="add-outline" size={16} color="#fff" />
            <Text style={s.confirmText}>Add Coin</Text>
          </TouchableOpacity>
        </View>
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
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 20, paddingBottom: 40,
  },
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
