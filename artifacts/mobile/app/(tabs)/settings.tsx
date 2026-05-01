import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
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
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

// ─── Storage Keys ────────────────────────────────────────────────────────────
const KEYS = {
  profile: "tm_profile",
  avatar: "trademock_profile_image",
  notif: "tm_notifications",
  privacy: "tm_privacy",
  appearance: "tm_appearance",
  learning: "tm_learning",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Profile { name: string; email: string }
interface NotifSettings { priceAlert: boolean; targetHit: boolean; stopLoss: boolean; newsAlert: boolean }
interface PrivacySettings { appLock: boolean; biometric: boolean; hideBalance: boolean; screenshotProtection: boolean }
interface AppearanceSettings { fontSize: "small" | "medium" | "large"; compactMode: boolean; chartBg: "dark" | "gradient" | "minimal" }
interface LearningSettings { beginnerTips: boolean; tradeExplanation: boolean; riskEducation: boolean; practiceReminders: boolean }

const DEFAULT_NOTIF: NotifSettings = { priceAlert: true, targetHit: true, stopLoss: true, newsAlert: false };
const DEFAULT_PRIVACY: PrivacySettings = { appLock: false, biometric: false, hideBalance: false, screenshotProtection: false };
const DEFAULT_APPEARANCE: AppearanceSettings = { fontSize: "medium", compactMode: false, chartBg: "dark" };
const DEFAULT_LEARNING: LearningSettings = { beginnerTips: true, tradeExplanation: true, riskEducation: false, practiceReminders: false };

// ─── Reusable Row Components ─────────────────────────────────────────────────
function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

function RowItem({
  icon, iconBg, label, sub, right, onPress, showChevron = false, colors, isFirst, isLast,
}: {
  icon: string; iconBg: string; label: string; sub?: string;
  right?: React.ReactNode; onPress?: () => void;
  showChevron?: boolean; colors: any; isFirst?: boolean; isLast?: boolean;
}) {
  const Inner = (
    <View style={[
      styles.row,
      isFirst && styles.rowFirst,
      isLast && styles.rowLast,
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      { backgroundColor: colors.card },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={15} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      {right}
      {showChevron && <Feather name="chevron-right" size={15} color={colors.mutedForeground} style={{ marginLeft: 4 }} />}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>
  ) : Inner;
}

function ToggleRow(props: { icon: string; iconBg: string; label: string; sub?: string; value: boolean; onToggle: (v: boolean) => void; colors: any; isFirst?: boolean; isLast?: boolean }) {
  return (
    <RowItem
      icon={props.icon} iconBg={props.iconBg} label={props.label} sub={props.sub}
      colors={props.colors} isFirst={props.isFirst} isLast={props.isLast}
      right={
        <Switch
          value={props.value}
          onValueChange={props.onToggle}
          trackColor={{ false: props.colors.muted, true: props.colors.primary }}
          thumbColor={props.value ? "#fff" : props.colors.mutedForeground}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      }
    />
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({
  visible, profile, onSave, onClose, colors,
}: {
  visible: boolean; profile: Profile;
  onSave: (p: Profile) => void; onClose: () => void; colors: any;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  useEffect(() => { setName(profile.name); setEmail(profile.email); }, [profile]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <TouchableOpacity onPress={() => onSave({ name: name.trim() || "Trader", email })}>
            <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="next"
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL</Text>
          <TextInput
            style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Font Size Modal ──────────────────────────────────────────────────────────
function FontSizeModal({
  visible, value, onSelect, onClose, colors,
}: {
  visible: boolean; value: string;
  onSelect: (v: "small" | "medium" | "large") => void; onClose: () => void; colors: any;
}) {
  const opts = [
    { key: "small" as const, label: "Small", desc: "Compact text" },
    { key: "medium" as const, label: "Medium", desc: "Default" },
    { key: "large" as const, label: "Large", desc: "Easier to read" },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centeredOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Font Size</Text>
          {opts.map((o) => (
            <TouchableOpacity key={o.key} style={[styles.pickerRow, { borderTopColor: colors.border }]} onPress={() => { onSelect(o.key); onClose(); }}>
              <View>
                <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{o.label}</Text>
                <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>{o.desc}</Text>
              </View>
              {value === o.key && <Feather name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ─── Chart BG Modal ────────────────────────────────────────────────────────
function ChartBgModal({
  visible, value, onSelect, onClose, colors,
}: {
  visible: boolean; value: string;
  onSelect: (v: "dark" | "gradient" | "minimal") => void; onClose: () => void; colors: any;
}) {
  const opts = [
    { key: "dark" as const, label: "Pure Dark", desc: "#0b0e17 background" },
    { key: "gradient" as const, label: "Gradient", desc: "Subtle blue-dark gradient" },
    { key: "minimal" as const, label: "Minimal", desc: "Light, clean, no grid" },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centeredOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Chart Background</Text>
          {opts.map((o) => (
            <TouchableOpacity key={o.key} style={[styles.pickerRow, { borderTopColor: colors.border }]} onPress={() => { onSelect(o.key); onClose(); }}>
              <View>
                <Text style={[styles.pickerLabel, { color: colors.foreground }]}>{o.label}</Text>
                <Text style={[styles.pickerSub, { color: colors.mutedForeground }]}>{o.desc}</Text>
              </View>
              {value === o.key && <Feather name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Settings Screen ────────────────────────────────────────────────────
export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useTradingContext();
  const isDark = theme === "dark";

  const [avatar, setAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({ name: "Trader", email: "" });
  const [notif, setNotif] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [learning, setLearning] = useState<LearningSettings>(DEFAULT_LEARNING);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [chartBgOpen, setChartBgOpen] = useState(false);

  // Load all settings
  useEffect(() => {
    async function load() {
      const [av, prof, no, pr, ap, le] = await Promise.all([
        AsyncStorage.getItem(KEYS.avatar),
        AsyncStorage.getItem(KEYS.profile),
        AsyncStorage.getItem(KEYS.notif),
        AsyncStorage.getItem(KEYS.privacy),
        AsyncStorage.getItem(KEYS.appearance),
        AsyncStorage.getItem(KEYS.learning),
      ]);
      if (av) setAvatar(av);
      if (prof) setProfile(JSON.parse(prof));
      if (no) setNotif(JSON.parse(no));
      if (pr) setPrivacy(JSON.parse(pr));
      if (ap) setAppearance(JSON.parse(ap));
      if (le) setLearning(JSON.parse(le));
    }
    load();
  }, []);

  // Persist helpers
  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify(p));
    setEditProfileOpen(false);
  }, []);

  const toggleNotif = useCallback(async (key: keyof NotifSettings) => {
    setNotif((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(KEYS.notif, JSON.stringify(next));
      return next;
    });
  }, []);

  const togglePrivacy = useCallback(async (key: keyof PrivacySettings) => {
    setPrivacy((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(KEYS.privacy, JSON.stringify(next));
      return next;
    });
  }, []);

  const setAppearanceKey = useCallback(<K extends keyof AppearanceSettings>(key: K, val: AppearanceSettings[K]) => {
    setAppearance((prev) => {
      const next = { ...prev, [key]: val };
      AsyncStorage.setItem(KEYS.appearance, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleLearning = useCallback(async (key: keyof LearningSettings) => {
    setLearning((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(KEYS.learning, JSON.stringify(next));
      return next;
    });
  }, []);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set avatar."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      await AsyncStorage.setItem(KEYS.avatar, uri);
    }
  }

  function handleExportCSV() {
    Alert.alert("Export Trade History", "Your trade history CSV will be prepared and downloaded.", [
      { text: "Cancel", style: "cancel" },
      { text: "Export", onPress: () => Alert.alert("Success", "Trade history exported! (Coming soon on native)") },
    ]);
  }

  function handleBackup() {
    Alert.alert("Backup Trades", "Your demo trades will be backed up to the cloud.", [
      { text: "Cancel", style: "cancel" },
      { text: "Backup Now", onPress: () => Alert.alert("Success", "Backup complete!") },
    ]);
  }

  function handleWhatsApp() {
    Linking.openURL("https://wa.me/911234567890?text=Hello%20Trade%20Mock%20Support").catch(() => {
      Alert.alert("Cannot open WhatsApp", "Please install WhatsApp and try again.");
    });
  }

  function handleReportBug() {
    Alert.alert("Report Bug", "Describe the bug and we'll fix it ASAP.", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Email", onPress: () => Linking.openURL("mailto:support@trademock.app?subject=Bug%20Report") },
    ]);
  }

  function handleFeatureRequest() {
    Alert.alert("Request Feature", "What feature would you like to see?", [
      { text: "Cancel", style: "cancel" },
      { text: "Open Email", onPress: () => Linking.openURL("mailto:support@trademock.app?subject=Feature%20Request") },
    ]);
  }

  function handleRateApp() {
    const url = Platform.OS === "ios"
      ? "https://apps.apple.com/app/id000000000"
      : "https://play.google.com/store/apps/details?id=com.trademock.app";
    Linking.openURL(url).catch(() => Alert.alert("Rate App", "Please search 'Trade Mock' in the App Store / Play Store."));
  }

  const fontLabel = { small: "Small", medium: "Medium", large: "Large" }[appearance.fontSize];
  const chartBgLabel = { dark: "Pure Dark", gradient: "Gradient", minimal: "Minimal" }[appearance.chartBg];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Page Title ─── */}
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>

      {/* ─── Profile Card ─── */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} activeOpacity={0.8}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="user" size={30} color={colors.mutedForeground} />
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Feather name="camera" size={10} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
            {profile.email || "Tap Edit to add email"}
          </Text>
          <View style={[styles.practiceBadge, { backgroundColor: colors.primary + "20" }]}>
            <View style={[styles.practiceDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.practiceLabel, { color: colors.primary }]}>Practice Account</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
          onPress={() => setEditProfileOpen(true)}
        >
          <Feather name="edit-2" size={13} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Notifications ─── */}
      <SectionHeader title="Notifications" colors={colors} />
      <View style={styles.section}>
        <ToggleRow icon="bell" iconBg="#3b82f6" label="Price Alert" sub="Notify on major price moves"
          value={notif.priceAlert} onToggle={() => toggleNotif("priceAlert")} colors={colors} isFirst />
        <ToggleRow icon="target" iconBg="#10b981" label="Target Hit Alert" sub="When take-profit is reached"
          value={notif.targetHit} onToggle={() => toggleNotif("targetHit")} colors={colors} />
        <ToggleRow icon="shield" iconBg="#ef4444" label="Stop Loss Alert" sub="When stop-loss is triggered"
          value={notif.stopLoss} onToggle={() => toggleNotif("stopLoss")} colors={colors} />
        <ToggleRow icon="rss" iconBg="#8b5cf6" label="News Alert" sub="Market-moving news events"
          value={notif.newsAlert} onToggle={() => toggleNotif("newsAlert")} colors={colors} isLast />
      </View>

      {/* ─── Privacy ─── */}
      <SectionHeader title="Privacy & Security" colors={colors} />
      <View style={styles.section}>
        <ToggleRow icon="lock" iconBg="#f59e0b" label="App Lock PIN" sub="Require PIN to open app"
          value={privacy.appLock} onToggle={() => togglePrivacy("appLock")} colors={colors} isFirst />
        <ToggleRow icon="cpu" iconBg="#6366f1" label="Biometric Lock" sub="Fingerprint / Face ID"
          value={privacy.biometric} onToggle={() => togglePrivacy("biometric")} colors={colors} />
        <ToggleRow icon="eye-off" iconBg="#64748b" label="Hide Balance" sub="Mask portfolio value"
          value={privacy.hideBalance} onToggle={() => togglePrivacy("hideBalance")} colors={colors} />
        <ToggleRow icon="camera-off" iconBg="#dc2626" label="Screenshot Protection" sub="Prevent screenshots"
          value={privacy.screenshotProtection} onToggle={() => togglePrivacy("screenshotProtection")} colors={colors} isLast />
      </View>

      {/* ─── Appearance ─── */}
      <SectionHeader title="Appearance" colors={colors} />
      <View style={styles.section}>
        <ToggleRow icon={isDark ? "moon" : "sun"} iconBg={isDark ? "#1e293b" : "#f59e0b"} label="Dark Mode"
          value={isDark} onToggle={(v) => setTheme(v ? "dark" : "light")} colors={colors} isFirst />
        <RowItem icon="type" iconBg="#0ea5e9" label="Font Size" colors={colors}
          right={<Text style={[styles.valueText, { color: colors.mutedForeground }]}>{fontLabel}</Text>}
          showChevron onPress={() => setFontSizeOpen(true)} />
        <ToggleRow icon="grid" iconBg="#7c3aed" label="Compact Mode" sub="Denser layout"
          value={appearance.compactMode} onToggle={(v) => setAppearanceKey("compactMode", v)} colors={colors} />
        <RowItem icon="image" iconBg="#0d9488" label="Chart Background" colors={colors}
          right={<Text style={[styles.valueText, { color: colors.mutedForeground }]}>{chartBgLabel}</Text>}
          showChevron onPress={() => setChartBgOpen(true)} isLast />
      </View>

      {/* ─── Learning Mode ─── */}
      <SectionHeader title="Learning Mode" colors={colors} />
      <View style={styles.section}>
        <ToggleRow icon="book-open" iconBg="#f59e0b" label="Beginner Tips" sub="Helpful hints for new traders"
          value={learning.beginnerTips} onToggle={() => toggleLearning("beginnerTips")} colors={colors} isFirst />
        <ToggleRow icon="info" iconBg="#3b82f6" label="Trade Explanation" sub="Explain each trade step"
          value={learning.tradeExplanation} onToggle={() => toggleLearning("tradeExplanation")} colors={colors} />
        <ToggleRow icon="alert-triangle" iconBg="#ef4444" label="Risk Education" sub="Show risk warnings"
          value={learning.riskEducation} onToggle={() => toggleLearning("riskEducation")} colors={colors} />
        <ToggleRow icon="clock" iconBg="#10b981" label="Practice Reminders" sub="Daily practice nudges"
          value={learning.practiceReminders} onToggle={() => toggleLearning("practiceReminders")} colors={colors} isLast />
      </View>

      {/* ─── Backup & Sync ─── */}
      <SectionHeader title="Backup & Sync" colors={colors} />
      <View style={styles.section}>
        <RowItem icon="upload-cloud" iconBg="#0ea5e9" label="Backup Demo Trades" sub="Save trades to cloud"
          colors={colors} showChevron onPress={handleBackup} isFirst />
        <RowItem icon="refresh-cw" iconBg="#6366f1" label="Sync Profile Data" sub="Last synced: Today"
          colors={colors} showChevron
          onPress={() => Alert.alert("Sync", "Profile data synced successfully!")} />
        <RowItem icon="download" iconBg="#10b981" label="Export Trade History CSV"
          sub="Download all trades as .csv" colors={colors} showChevron onPress={handleExportCSV} isLast />
      </View>

      {/* ─── Support ─── */}
      <SectionHeader title="Support" colors={colors} />
      <View style={styles.section}>
        <RowItem icon="alert-circle" iconBg="#ef4444" label="Report Bug"
          sub="Found an issue? Tell us" colors={colors} showChevron onPress={handleReportBug} isFirst />
        <RowItem icon="zap" iconBg="#f59e0b" label="Request Feature"
          sub="Suggest something new" colors={colors} showChevron onPress={handleFeatureRequest} />
        <RowItem icon="message-circle" iconBg="#25D366" label="WhatsApp Support"
          sub="Chat with us on WhatsApp" colors={colors} showChevron onPress={handleWhatsApp} />
        <RowItem icon="star" iconBg="#eab308" label="Rate App"
          sub="Love Trade Mock? Rate us!" colors={colors} showChevron onPress={handleRateApp} isLast />
      </View>

      {/* ─── App Version ─── */}
      <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Trade Mock v1.0.0 · Practice. Learn. Trade.</Text>

      {/* ─── Modals ─── */}
      <EditProfileModal
        visible={editProfileOpen}
        profile={profile}
        onSave={saveProfile}
        onClose={() => setEditProfileOpen(false)}
        colors={colors}
      />
      <FontSizeModal
        visible={fontSizeOpen}
        value={appearance.fontSize}
        onSelect={(v) => setAppearanceKey("fontSize", v)}
        onClose={() => setFontSizeOpen(false)}
        colors={colors}
      />
      <ChartBgModal
        visible={chartBgOpen}
        value={appearance.chartBg}
        onSelect={(v) => setAppearanceKey("chartBg", v)}
        onClose={() => setChartBgOpen(false)}
        colors={colors}
      />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: {
    fontSize: 28, fontWeight: "700", letterSpacing: -0.5,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },

  // Profile card
  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 20,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  cameraBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileEmail: { fontSize: 12, marginTop: 2 },
  practiceBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, alignSelf: "flex-start",
  },
  practiceDot: { width: 6, height: 6, borderRadius: 3 },
  practiceLabel: { fontSize: 10, fontWeight: "600" },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  editBtnText: { fontSize: 12, fontWeight: "600" },

  // Section
  sectionTitle: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.6,
    marginHorizontal: 16, marginBottom: 6, marginTop: 4,
  },
  section: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 14, overflow: "hidden",
  },

  // Row
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, minHeight: 56,
  },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 11, marginTop: 1 },
  valueText: { fontSize: 13, marginRight: 2 },

  // Edit profile modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalCancel: { fontSize: 15 },
  modalSave: { fontSize: 15, fontWeight: "700" },
  modalBody: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  fieldInput: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15,
  },

  // Picker modal
  centeredOverlay: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#00000070",
  },
  pickerBox: {
    width: 280, borderRadius: 16, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
  },
  pickerTitle: { fontSize: 15, fontWeight: "700", padding: 16, paddingBottom: 12 },
  pickerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickerLabel: { fontSize: 14, fontWeight: "500" },
  pickerSub: { fontSize: 11, marginTop: 2 },

  // Footer
  versionText: {
    textAlign: "center", fontSize: 11,
    marginTop: 8, marginBottom: 16,
  },
});
