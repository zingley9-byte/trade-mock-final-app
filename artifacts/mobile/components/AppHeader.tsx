import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "trademock_profile_image";

export default function AppHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, currencyMode, setCurrencyMode } =
    useTradingContext();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const isDark = theme === "dark";

  React.useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((v) => {
      if (v) setProfileImage(v);
    });
  }, []);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to set profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem(PROFILE_KEY, uri);
    }
  }

  function handleLogout() {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            setProfileImage(null);
            await AsyncStorage.removeItem(PROFILE_KEY);
            await AsyncStorage.removeItem("tm_auth_user");
            setProfileOpen(false);
            router.replace("/auth");
          },
        },
      ]
    );
  }

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.header,
            borderBottomColor: colors.border,
            paddingTop: topPad + 10,
          },
        ]}
      >
        <Image
          source={require("@/assets/images/logo_transparent.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />

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
            onPress={() => setProfileOpen(true)}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImg} />
            ) : (
              <Feather name="user" size={16} color={colors.foreground} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={() => setProfileOpen(false)}
        />
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              top: topPad + 66,
            },
          ]}
        >
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  logoImg: { width: 140, height: 44 },
  marketSwitch: {
    flexDirection: "row",
    padding: 3,
    gap: 2,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  switchText: { fontSize: 12, fontWeight: "600" as const },
  rightGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyText: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  avatarImg: { width: 34, height: 34, borderRadius: 17 },
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  dropdown: {
    position: "absolute",
    right: 14,
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 100,
  },
  avatarLarge: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
    position: "relative",
  },
  avatarLargeImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 14, fontWeight: "500" as const },
});
