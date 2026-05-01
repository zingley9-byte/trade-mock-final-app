import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CoinLogo from "@/components/CoinLogo";

const PROFILE_KEY = "trademock_profile_image";

const COIN_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A", ETHUSDT: "#627EEA", BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633", SOLUSDT: "#9945FF",
  NIFTY50: "#1a7ef7", SENSEX: "#e84040",
  BANKNIFTY: "#16a34a", BANKEX: "#7c3aed",
};

// Settings search items
const SETTINGS_ITEMS = [
  { id: "s_settings", label: "Settings", sub: "All settings", icon: "settings" as const, action: "settings" },
  { id: "s_profile", label: "Profile", sub: "Edit name & avatar", icon: "user" as const, action: "settings" },
  { id: "s_notif", label: "Notifications", sub: "Price & trade alerts", icon: "bell" as const, action: "settings" },
  { id: "s_privacy", label: "Privacy & Security", sub: "Lock, biometric", icon: "lock" as const, action: "settings" },
  { id: "s_appearance", label: "Appearance", sub: "Theme, font, chart", icon: "sliders" as const, action: "settings" },
  { id: "s_learning", label: "Learning Mode", sub: "Tips & education", icon: "book-open" as const, action: "settings" },
  { id: "s_backup", label: "Backup & Sync", sub: "Export trades", icon: "upload-cloud" as const, action: "settings" },
  { id: "s_support", label: "Support", sub: "Bug report, WhatsApp", icon: "help-circle" as const, action: "settings" },
];

export default function AppHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, currencyMode, setCurrencyMode, setSelectedSymbol, symbolPrices } = useTradingContext();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const isDark = theme === "dark";

  React.useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((v) => { if (v) setProfileImage(v); });
  }, []);

  // ─── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { coins: SYMBOLS.slice(0, 5), settings: SETTINGS_ITEMS.slice(0, 3) };

    const coins = SYMBOLS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
    const settings = SETTINGS_ITEMS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q)
    );
    return { coins, settings };
  }, [searchQuery]);

  const showDropdown = searchFocused && (searchResults.coins.length > 0 || searchResults.settings.length > 0);

  function selectCoin(sym: typeof SYMBOLS[0]) {
    setSelectedSymbol(sym);
    setSearchQuery("");
    setSearchFocused(false);
    searchRef.current?.blur();
    router.push("/(tabs)");
  }

  function selectSetting() {
    setSearchQuery("");
    setSearchFocused(false);
    searchRef.current?.blur();
    router.push("/(tabs)/settings");
  }

  // ─── Avatar / profile ──────────────────────────────────────────────────────
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem(PROFILE_KEY, uri);
    }
  }

  function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: async () => {
          setProfileImage(null);
          await AsyncStorage.removeItem(PROFILE_KEY);
          await AsyncStorage.removeItem("tm_auth_user");
          setProfileOpen(false);
          router.replace("/auth");
        },
      },
    ]);
  }

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <>
      {/* ─── Header bar ─── */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        {/* Search bar */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: searchFocused ? colors.primary : "transparent" }]}>
          <Feather name="search" size={15} color={searchFocused ? colors.primary : colors.mutedForeground} />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search coins, settings…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Right controls */}
        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={[styles.currencyBtn, { backgroundColor: colors.muted }]}
            onPress={() => setCurrencyMode(currencyMode === "usd" ? "inr" : "usd")}
          >
            <Text style={[styles.currencyText, { color: colors.foreground }]}>
              {currencyMode === "usd" ? "USD" : "INR"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.muted, borderColor: colors.primary }]}
            onPress={() => { setSearchFocused(false); setProfileOpen(true); }}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} />
            ) : (
              <Feather name="user" size={16} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search dropdown ─── */}
      {showDropdown && (
        <>
          <Pressable style={styles.searchBackdrop} onPress={() => { setSearchFocused(false); setSearchQuery(""); }} />
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, top: topPad + 58 }]}>
            <ScrollView
              style={{ maxHeight: 340 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Coin results */}
              {searchResults.coins.length > 0 && (
                <>
                  <View style={[styles.resultHeader, { borderBottomColor: colors.border }]}>
                    <Feather name="bar-chart-2" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.resultHeaderText, { color: colors.mutedForeground }]}>MARKETS</Text>
                  </View>
                  {searchResults.coins.map((sym) => {
                    const ticker = sym.label.replace("/USDT", "");
                    const price = symbolPrices[sym.id];
                    return (
                      <TouchableOpacity
                        key={sym.id}
                        style={[styles.resultRow, { borderBottomColor: colors.border }]}
                        onPress={() => selectCoin(sym)}
                        activeOpacity={0.7}
                      >
                        <CoinLogo symbolId={sym.id} size={32} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultLabel, { color: colors.foreground }]}>{ticker}</Text>
                          <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>{sym.name}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: sym.type === "crypto" ? "#f59e0b22" : "#1a7ef722" }]}>
                          <Text style={[styles.typeText, { color: sym.type === "crypto" ? "#f59e0b" : "#1a7ef7" }]}>
                            {sym.type === "crypto" ? "CRYPTO" : "INDIAN"}
                          </Text>
                        </View>
                        {price ? (
                          <Text style={[styles.resultPrice, { color: colors.foreground }]}>
                            {price >= 1000 ? price.toFixed(0) : price >= 1 ? price.toFixed(2) : price.toFixed(4)}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Settings results */}
              {searchResults.settings.length > 0 && (
                <>
                  <View style={[styles.resultHeader, { borderBottomColor: colors.border }]}>
                    <Feather name="settings" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.resultHeaderText, { color: colors.mutedForeground }]}>SETTINGS</Text>
                  </View>
                  {searchResults.settings.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.resultRow, { borderBottomColor: colors.border }]}
                      onPress={selectSetting}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.resultIcon, { backgroundColor: colors.muted }]}>
                        <Feather name={item.icon} size={13} color={colors.mutedForeground} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultLabel, { color: colors.foreground }]}>{item.label}</Text>
                        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                      </View>
                      <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </>
      )}

      {/* ─── Profile dropdown modal ─── */}
      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={[styles.profileBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setProfileOpen(false)} />
        <View style={[styles.profileDropdown, { backgroundColor: colors.card, borderColor: colors.border, top: topPad + 58 }]}>
          <TouchableOpacity style={styles.avatarLarge} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarLargeImg} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="user" size={28} color={colors.mutedForeground} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.foreground }]}>Trader</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Feather name={isDark ? "moon" : "sun"} size={16} color={colors.foreground} />
              <Text style={[styles.menuText, { color: colors.foreground }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? "dark" : "light")}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={isDark ? "#fff" : colors.mutedForeground}
            />
          </View>

          <TouchableOpacity style={styles.menuRow} onPress={() => { setProfileOpen(false); router.push("/(tabs)/settings"); }}>
            <View style={styles.menuLeft}>
              <Feather name="settings" size={16} color={colors.foreground} />
              <Text style={[styles.menuText, { color: colors.foreground }]}>Settings</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
            <View style={styles.menuLeft}>
              <Feather name="log-out" size={16} color={colors.bear} />
              <Text style={[styles.menuText, { color: colors.bear }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 10, gap: 8,
  },

  // Search
  searchWrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },

  // Right controls
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  currencyBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  currencyText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  avatarBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, overflow: "hidden",
  },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },

  // Search backdrop
  searchBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },

  // Search dropdown
  dropdown: {
    position: "absolute", left: 10, right: 10, zIndex: 100,
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 16,
  },
  resultHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultHeaderText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  resultIconText: { fontSize: 14, fontWeight: "700" },
  resultLabel: { fontSize: 13, fontWeight: "600" },
  resultSub: { fontSize: 11, marginTop: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginRight: 6 },
  typeText: { fontSize: 9, fontWeight: "700" },
  resultPrice: { fontSize: 12, fontWeight: "600", minWidth: 50, textAlign: "right" },

  // Profile dropdown
  profileBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  profileDropdown: {
    position: "absolute", right: 14, width: 220,
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 12, zIndex: 100,
  },
  avatarLarge: { alignSelf: "center", marginTop: 16, marginBottom: 8, position: "relative" },
  avatarLargeImg: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  editBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  profileName: { textAlign: "center", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth },
  menuRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 14, fontWeight: "500" },
});
