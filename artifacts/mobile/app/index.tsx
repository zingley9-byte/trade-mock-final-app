import AsyncStorage from "@react-native-async-storage/async-storage";
import { TM_AUTH_KEY, TM_ONBOARDED_KEY } from "@/constants/authKeys";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, View } from "react-native";
import LandingPage from "@/components/LandingPage";
import MobileLandingPage from "@/components/MobileLandingPage";
import { getFirebaseAuth } from "@/lib/firebase";

const { width, height } = Dimensions.get("window");

// Desktop web = width ≥ 768. Mobile web = 768 below.
const isDesktopWeb = Platform.OS === "web" && width >= 768;
const isMobileWeb  = Platform.OS === "web" && width < 768;

// ── Mobile/Native: existing animated splash + auth routing ─────────────────
function NativeSplash() {
  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity  = useRef(new Animated.Value(0)).current;

  async function navigate() {
    try {
      const onboarded = await AsyncStorage.getItem(TM_ONBOARDED_KEY);
      const auth      = await AsyncStorage.getItem(TM_AUTH_KEY);
      if (!onboarded) {
        router.replace("/onboarding");
      } else if (!auth) {
        router.replace("/auth");
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      router.replace("/(tabs)");
    }
  }

  useEffect(() => {
    const fallback = setTimeout(navigate, 2400);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity,  { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(logoScale,    { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(glowOpacity,  { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(1200),
    ]).start(({ finished }) => {
      if (finished) {
        clearTimeout(fallback);
        navigate();
      }
    });

    return () => clearTimeout(fallback);
  }, []);

  return (
    <LinearGradient
      colors={["#000000", "#0a0a1a", "#0d0d2b", "#000000"]}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.container}
    >
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>

        <Animated.View style={{ opacity: taglineOpacity, alignItems: "center" }}>
          <Text style={styles.appName}>Trade Mock</Text>
          <Text style={styles.tagline}>Practice Like Pro</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.dotsRow, { opacity: taglineOpacity }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

// ── Web: check Firebase session before showing landing page ─────────────────
// On browser refresh the user should stay in the app if already logged in.
function WebIndexScreen({ desktop }: { desktop: boolean }) {
  // "checking" = verifying session | "landing" = show landing page
  const [view, setView] = useState<"checking" | "landing">("checking");

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;

    async function check() {
      try {
        // 1. Fast path: AsyncStorage key present → go to tabs immediately
        const saved = await AsyncStorage.getItem(TM_AUTH_KEY);
        if (saved && !cancelled) {
          router.replace("/(tabs)");
          return;
        }

        // 2. Check Firebase current user (may already be restored)
        const fbAuth = getFirebaseAuth();
        if (fbAuth.currentUser && !cancelled) {
          const u = fbAuth.currentUser;
          await AsyncStorage.setItem(TM_AUTH_KEY, JSON.stringify({
            uid: u.uid, email: u.email ?? "", name: u.displayName ?? u.email?.split("@")[0] ?? "User",
          })).catch(() => {});
          if (!cancelled) router.replace("/(tabs)");
          return;
        }

        // 3. Subscribe briefly — Firebase may not have restored session yet
        unsub = fbAuth.onAuthStateChanged((user) => {
          if (cancelled) return;
          if (user) {
            AsyncStorage.setItem(TM_AUTH_KEY, JSON.stringify({
              uid: user.uid, email: user.email ?? "", name: user.displayName ?? user.email?.split("@")[0] ?? "User",
            })).catch(() => {});
            router.replace("/(tabs)");
          }
        });

        // 4. After 1.5 s with no session → show landing page
        setTimeout(() => {
          if (!cancelled) setView("landing");
        }, 1500);
      } catch {
        if (!cancelled) setView("landing");
      }
    }

    check();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  if (view === "checking") {
    // Minimal dark screen while we check — avoids flash of landing page
    return <View style={{ flex: 1, backgroundColor: "#0B0E11" }} />;
  }

  return desktop ? <LandingPage /> : <MobileLandingPage />;
}

// ── Root export ────────────────────────────────────────────────────────────
// Desktop web → check auth → landing page | mobile web → check auth → mobile landing | native → splash/auth
export default function IndexScreen() {
  if (isDesktopWeb) return <WebIndexScreen desktop />;
  if (isMobileWeb)  return <WebIndexScreen desktop={false} />;
  return <NativeSplash />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "transparent",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 80,
    top: height / 2 - 200, left: width / 2 - 150,
  },
  center:   { alignItems: "center", gap: 20 },
  logoWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  glowRing: {
    position: "absolute",
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: "transparent",
    borderWidth: 1, borderColor: "#3b82f620",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 30,
  },
  logo:    { width: 150, height: 150, borderRadius: 75, overflow: "hidden" },
  appName: { fontSize: 32, fontWeight: "800", color: "#ffffff", letterSpacing: 1, marginTop: 8 },
  tagline: { fontSize: 14, color: "#3b82f6", letterSpacing: 3, textTransform: "uppercase", fontWeight: "500", marginTop: 4 },
  dotsRow: { position: "absolute", bottom: 60, flexDirection: "row", gap: 8 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ffffff30" },
  dotActive: { backgroundColor: "#3b82f6", width: 20, borderRadius: 3 },
});
