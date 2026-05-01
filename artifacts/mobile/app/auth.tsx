import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TM_AUTH_KEY } from "@/constants/authKeys";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

async function saveUser(uid: string, email: string, name: string) {
  await AsyncStorage.setItem(TM_AUTH_KEY, JSON.stringify({ uid, email, name }));
}

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const nd = Platform.OS !== "web";

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: nd }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: nd }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: nd }),
      ])
    ).start();
  }, []);

  function switchMode(m: "login" | "signup") {
    setMode(m);
    setError("");
  }

  function parseFirebaseError(code: string): string {
    switch (code) {
      case "auth/invalid-email": return "Invalid email address.";
      case "auth/user-not-found": return "No account found with this email.";
      case "auth/wrong-password": return "Incorrect password.";
      case "auth/email-already-in-use": return "An account already exists with this email.";
      case "auth/weak-password": return "Password should be at least 6 characters.";
      case "auth/too-many-requests": return "Too many attempts. Try again later.";
      case "auth/invalid-credential": return "Incorrect email or password.";
      default: return "Something went wrong. Please try again.";
    }
  }

  async function handleSubmit() {
    setError("");
    if (!email.trim()) { setError("Enter your email"); return; }
    if (!password) { setError("Enter your password"); return; }
    if (mode === "signup") {
      if (!name.trim()) { setError("Enter your name"); return; }
      if (password !== confirm) { setError("Passwords don't match"); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    }

    setLoading(true);
    try {
      const fbAuth = getFirebaseAuth();
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(fbAuth, email.trim(), password);
        const user = cred.user;
        await saveUser(user.uid, user.email ?? email, user.displayName ?? email.split("@")[0]);
      } else {
        const cred = await createUserWithEmailAndPassword(fbAuth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await saveUser(cred.user.uid, email, name.trim());
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(parseFirebaseError(e?.code ?? ""));
    } finally {
      setLoading(false);
    }
  }

  const glowStyle = {
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
  };

  return (
    <LinearGradient colors={["#000000", "#06060f", "#0a0a1e", "#000000"]} style={styles.bg}>
      <Animated.View style={[styles.glow1, glowStyle]} />
      <Animated.View style={[styles.glow2, glowStyle]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
            <View style={styles.logoSection}>
              <View style={styles.logoGlowWrap}>
                <Image
                  source={require("@/assets/images/logo_transparent.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>Trade Mock</Text>
              <Text style={styles.appSub}>Practice. Learn. Trade. Succeed.</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, mode === "login" && styles.tabActive]}
                  onPress={() => switchMode("login")}
                >
                  <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === "signup" && styles.tabActive]}
                  onPress={() => switchMode("signup")}
                >
                  <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {mode === "signup" && (
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full Name"
                      placeholderTextColor="#475569"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#475569"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor="#475569"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPass ? "🙈" : "👁️"}</Text>
                  </TouchableOpacity>
                </View>

                {mode === "signup" && (
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="#475569"
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showPass}
                    />
                  </View>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={styles.mainBtn}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#2563eb", "#3b82f6", "#1d4ed8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mainBtnGrad}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.mainBtnText}>
                        {mode === "login" ? "Login" : "Create Account"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

              </View>

              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => switchMode(mode === "login" ? "signup" : "login")}
              >
                <Text style={styles.switchText}>
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <Text style={styles.switchLink}>
                    {mode === "login" ? "Sign Up" : "Login"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  glow1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1d4ed830",
    top: -60,
    left: -60,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },
  glow2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#7c3aed20",
    bottom: 80,
    right: -40,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
  },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 40 },
  inner: { paddingHorizontal: 20, gap: 28 },
  logoSection: { alignItems: "center", gap: 6 },
  logoGlowWrap: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  logo: { width: 90, height: 90 },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  appSub: {
    fontSize: 11,
    color: "#3b82f6",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  tab: { flex: 1, paddingVertical: 16, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#3b82f6" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  tabTextActive: { color: "#3b82f6" },
  form: { padding: 20, gap: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, color: "#f1f5f9", fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  errorText: { color: "#f87171", fontSize: 13, textAlign: "center", marginTop: -4 },
  mainBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  mainBtnGrad: { paddingVertical: 16, alignItems: "center" },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  switchRow: {
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  switchText: { color: "#64748b", fontSize: 13 },
  switchLink: { color: "#3b82f6", fontWeight: "700" },
});
