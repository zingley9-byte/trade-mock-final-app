import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import SvgIcon from "@/components/SvgIcon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SYMBOLS, useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CoinLogo from "@/components/CoinLogo";
import { useAdmin } from "@/context/AdminContext";

const PROFILE_KEY = "trademock_profile_image";

const STATIC_ANNOUNCEMENTS = [
  {
    icon: "sparkles-outline",
    color: "#f59e0b",
    title: "Modify Position Now Live!",
    body: "You can now edit Stop Loss & Take Profit on any open position directly from the Portfolio tab.",
    date: "May 5, 2026",
    isNew: true,
  },
  {
    icon: "rocket-outline",
    color: "#10b981",
    title: "100+ Coins Coming Soon",
    body: "We are expanding our coins list to 100+ cryptocurrencies. Stay tuned for the update!",
    date: "May 3, 2026",
    isNew: true,
  },
  {
    icon: "bar-chart-outline",
    color: "#6366f1",
    title: "Multi-Timeframe Charts",
    body: "Switch between 1m, 5m, 15m, 30m, 1h, and 1D candles to analyse any market.",
    date: "Apr 28, 2026",
    isNew: false,
  },
  {
    icon: "shield-checkmark-outline",
    color: "#3b82f6",
    title: "Liquidation Price Alerts",
    body: "Get a warning when your position is approaching the liquidation threshold.",
    date: "Apr 20, 2026",
    isNew: false,
  },
  {
    icon: "gift-outline",
    color: "#ec4899",
    title: "Welcome to Trade Mock Pro",
    body: "Practice crypto futures trading risk-free with ₹10,00,000 virtual balance. No real money involved.",
    date: "Apr 10, 2026",
    isNew: false,
  },
];

const ADMIN_TYPE_COLORS: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  success: "#22c55e",
};
const ADMIN_TYPE_ICONS: Record<string, string> = {
  info: "information-circle-outline",
  warning: "warning-outline",
  success: "checkmark-circle-outline",
};

const COIN_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A", ETHUSDT: "#627EEA", BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633", SOLUSDT: "#9945FF",
};

// Settings search items
const SETTINGS_ITEMS = [
  { id: "s_settings", label: "Settings", sub: "All settings", icon: "settings-outline" as const, action: "settings" },
  { id: "s_profile", label: "Profile", sub: "Edit name & avatar", icon: "person-outline" as const, action: "settings" },
  { id: "s_notif", label: "Notifications", sub: "Price & trade alerts", icon: "notifications-outline" as const, action: "settings" },
  { id: "s_privacy", label: "Privacy & Security", sub: "Lock, biometric", icon: "lock-closed-outline" as const, action: "settings" },
  { id: "s_appearance", label: "Appearance", sub: "Theme, font, chart", icon: "options-outline" as const, action: "settings" },
  { id: "s_learning", label: "Learning Mode", sub: "Tips & education", icon: "book-outline" as const, action: "settings" },
  { id: "s_backup", label: "Backup & Sync", sub: "Export trades", icon: "cloud-upload-outline" as const, action: "settings" },
  { id: "s_support", label: "Support", sub: "Bug report, WhatsApp", icon: "help-circle-outline" as const, action: "settings" },
];

export default function AppHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, currencyMode, setCurrencyMode, setSelectedSymbol, symbolPrices } = useTradingContext();

  const { announcements: adminAnnouncements } = useAdmin();
  const activeAdminAnnouncements = adminAnnouncements.filter((a) => a.active);

  const [profileOpen, setProfileOpen]   = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const isDark = theme === "dark";

  // Track screen dimensions — on Android, rotation changes width/height.
  // When orientation flips, immediately blur search & dismiss keyboard so
  // the search bar does not auto-open during re-render.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const prevOrientationRef = useRef<"portrait" | "landscape">(
    screenWidth > screenHeight ? "landscape" : "portrait"
  );
  React.useEffect(() => {
    const current = screenWidth > screenHeight ? "landscape" : "portrait";
    if (current !== prevOrientationRef.current) {
      prevOrientationRef.current = current;
      // Orientation changed — close search bar immediately
      Keyboard.dismiss();
      searchRef.current?.blur();
      setSearchFocused(false);
      setSearchQuery("");
    }
  }, [screenWidth, screenHeight]);

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

  async function handleShare() {
    const shareText = "🔥 Trade Mock Pro — Practice trading FREE with ₹10,00,000 virtual money!\nLearn crypto trading without any risk 🚀";
    const shareUrl  = Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.href
      : "https://trademock.app";
    const full = shareText + "\n" + shareUrl;

    setProfileOpen(false);

    if (Platform.OS !== "web") {
      try { await Share.share({ message: full }); } catch {}
      return;
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(full)}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      if (typeof window !== "undefined") window.open(waUrl, "_blank");
    }
  }

  function openFeedback() {
    setProfileOpen(false);
    setFeedbackText("");
    setFeedbackRating(0);
    setFeedbackSent(false);
    setFeedbackOpen(true);
  }

  function submitFeedback() {
    if (feedbackRating === 0 && feedbackText.trim() === "") return;
    setFeedbackSent(true);
    setTimeout(() => setFeedbackOpen(false), 1800);
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
          <SvgIcon name="search-outline" size={15} color={searchFocused ? colors.primary : colors.mutedForeground} />
          <TextInput
            ref={searchRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search coins, settings…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <SvgIcon name="close-outline" size={13} color={colors.mutedForeground} />
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

          {/* Announcements */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            onPress={() => setAnnouncementsOpen(true)}
          >
            <SvgIcon name="notifications-outline" size={16} color={colors.foreground} />
            {activeAdminAnnouncements.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{activeAdminAnnouncements.length > 9 ? "9+" : activeAdminAnnouncements.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: colors.muted, borderColor: colors.primary }]}
            onPress={() => { setSearchFocused(false); setProfileOpen(true); }}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} />
            ) : (
              <SvgIcon name="person-outline" size={16} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Announcements modal ─── */}
      <Modal visible={announcementsOpen} transparent animationType="slide" onRequestClose={() => setAnnouncementsOpen(false)}>
        <Pressable style={[styles.profileBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setAnnouncementsOpen(false)} />
        <View style={[styles.announcSheet, { backgroundColor: colors.card, paddingBottom: topPad + 16 }]}>
          <View style={[styles.announcHandle, { backgroundColor: colors.border }]} />
          <View style={styles.announcHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <SvgIcon name="notifications-outline" size={18} color={colors.foreground} />
              <Text style={[styles.announcTitle, { color: colors.foreground }]}>Announcements</Text>
            </View>
            <TouchableOpacity onPress={() => setAnnouncementsOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <SvgIcon name="close-outline" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Live admin announcements */}
            {activeAdminAnnouncements.length > 0 && (
              <>
                <View style={[styles.announcSectionLabel, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.announcSectionText, { color: colors.primary }]}>FROM ADMIN</Text>
                </View>
                {activeAdminAnnouncements.map((a) => {
                  const color = ADMIN_TYPE_COLORS[a.type] ?? "#3b82f6";
                  const icon  = ADMIN_TYPE_ICONS[a.type]  ?? "information-circle-outline";
                  const date  = new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <View key={a.id} style={[styles.announcRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.announcIconWrap, { backgroundColor: color + "22" }]}>
                        <SvgIcon name={icon as any} size={16} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Text style={[styles.announcRowTitle, { color: colors.foreground }]}>{a.title}</Text>
                          <View style={[styles.newBadge, { backgroundColor: color }]}>
                            <Text style={styles.newBadgeText}>{a.type.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={[styles.announcRowBody, { color: colors.mutedForeground }]}>{a.message}</Text>
                        <Text style={[styles.announcRowDate, { color: colors.mutedForeground }]}>{date}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Static announcements */}
            <View style={[styles.announcSectionLabel, { borderBottomColor: colors.border }]}>
              <Text style={[styles.announcSectionText, { color: colors.mutedForeground }]}>UPDATES</Text>
            </View>
            {STATIC_ANNOUNCEMENTS.map((a, i) => (
              <View key={i} style={[styles.announcRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.announcIconWrap, { backgroundColor: a.color + "22" }]}>
                  <SvgIcon name={a.icon as any} size={16} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={[styles.announcRowTitle, { color: colors.foreground }]}>{a.title}</Text>
                    {a.isNew && (
                      <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.announcRowBody, { color: colors.mutedForeground }]}>{a.body}</Text>
                  <Text style={[styles.announcRowDate, { color: colors.mutedForeground }]}>{a.date}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
                    <SvgIcon name="bar-chart-outline" size={11} color={colors.mutedForeground} />
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
                        <View style={[styles.typeBadge, { backgroundColor: "#f59e0b22" }]}>
                          <Text style={[styles.typeText, { color: "#f59e0b" }]}>CRYPTO</Text>
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
                    <SvgIcon name="settings-outline" size={11} color={colors.mutedForeground} />
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
                        <SvgIcon name={item.icon} size={13} color={colors.mutedForeground} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultLabel, { color: colors.foreground }]}>{item.label}</Text>
                        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                      </View>
                      <SvgIcon name="chevron-forward-outline" size={13} color={colors.mutedForeground} />
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
                <SvgIcon name="person-outline" size={28} color={colors.mutedForeground} />
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              <SvgIcon name="camera-outline" size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.profileName, { color: colors.foreground }]}>Trader</Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? "#3b2f0a" : "#fef9c3" }]}>
                <SvgIcon name={isDark ? "moon-outline" : "sunny-outline"} size={16} color="#f59e0b" />
              </View>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? "dark" : "light")}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={isDark ? "#fff" : colors.mutedForeground}
            />
          </View>

          <TouchableOpacity style={styles.menuRow} onPress={() => { setProfileOpen(false); router.push("/(tabs)/settings"); }} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: "#1e3a2f" }]}>
                <SvgIcon name="settings-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Settings</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleShare} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: "#0f2d20" }]}>
                <SvgIcon name="share-social-outline" size={16} color="#10b981" />
              </View>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Share with Friends</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow} onPress={openFeedback} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: "#1e1b4b" }]}>
                <SvgIcon name="chatbubble-outline" size={16} color="#6366f1" />
              </View>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Feedback</Text>
            </View>
            <SvgIcon name="chevron-forward-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.menuRow} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: "#2d0f0f" }]}>
                <SvgIcon name="log-out-outline" size={16} color={colors.bear} />
              </View>
              <Text style={[styles.menuText, { color: colors.bear }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ─── Feedback Modal ─── */}
      <Modal visible={feedbackOpen} transparent animationType="fade" onRequestClose={() => setFeedbackOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.fbKav}
        >
          <Pressable style={[styles.profileBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setFeedbackOpen(false)} />
          <View style={[styles.fbSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {feedbackSent ? (
              <View style={styles.fbThanks}>
                <Text style={styles.fbThanksEmoji}>❤️</Text>
                <Text style={[styles.fbThanksText, { color: colors.foreground }]}>Thanks for your feedback!</Text>
              </View>
            ) : (
              <>
                <View style={styles.fbHeader}>
                  <SvgIcon name="chatbubble-outline" size={18} color="#6366f1" />
                  <Text style={[styles.fbTitle, { color: colors.foreground }]}>Send Feedback</Text>
                  <TouchableOpacity onPress={() => setFeedbackOpen(false)} style={{ marginLeft: "auto" }}>
                    <SvgIcon name="close-outline" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fbLabel, { color: colors.mutedForeground }]}>How would you rate Trade Mock Pro?</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)} activeOpacity={0.7}>
                      <Text style={[styles.star, { color: star <= feedbackRating ? "#f59e0b" : colors.border }]}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fbLabel, { color: colors.mutedForeground }]}>Tell us more (optional)</Text>
                <TextInput
                  style={[styles.fbInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Your thoughts, suggestions, bugs…"
                  placeholderTextColor={colors.mutedForeground}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.fbBtn, { backgroundColor: feedbackRating > 0 || feedbackText.trim() ? "#6366f1" : colors.muted }]}
                  onPress={submitFeedback}
                  activeOpacity={0.8}
                >
                  <SvgIcon name="send-outline" size={15} color="#fff" />
                  <Text style={styles.fbBtnText}>Submit Feedback</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
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
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  badge: {
    position: "absolute", top: -2, right: -2,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" as const },
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
  menuIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },

  // Feedback modal
  fbKav:    { flex: 1, justifyContent: "center", alignItems: "center" },
  fbSheet: {
    width: "88%", borderRadius: 18, borderWidth: 1,
    padding: 20, zIndex: 200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 20,
  },
  fbHeader:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  fbTitle:     { fontSize: 16, fontWeight: "700" as const },
  fbLabel:     { fontSize: 12, fontWeight: "600" as const, marginBottom: 8, marginTop: 4 },
  starsRow:    { flexDirection: "row", gap: 6, marginBottom: 16 },
  star:        { fontSize: 36 },
  fbInput: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, fontSize: 14, minHeight: 90,
    marginBottom: 16,
  },
  fbBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 12,
  },
  fbBtnText:   { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  fbThanks:    { alignItems: "center", paddingVertical: 28, gap: 10 },
  fbThanksEmoji: { fontSize: 40 },
  fbThanksText:  { fontSize: 16, fontWeight: "700" as const },

  // Announcements sheet
  announcSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 10, paddingHorizontal: 0, maxHeight: "80%",
  },
  announcHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  announcHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, marginBottom: 10,
  },
  announcTitle: { fontSize: 17, fontWeight: "700" as const },
  announcRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  announcIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  announcRowTitle: { fontSize: 14, fontWeight: "700" as const },
  announcRowBody:  { fontSize: 13, lineHeight: 19, marginTop: 2, marginBottom: 4 },
  announcRowDate:  { fontSize: 11 },
  newBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as const, letterSpacing: 0.5 },
  announcSectionLabel: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  announcSectionText: { fontSize: 10, fontWeight: "800" as const, letterSpacing: 1 },
});
