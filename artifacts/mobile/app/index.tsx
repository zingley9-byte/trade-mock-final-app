import AsyncStorage from "@react-native-async-storage/async-storage";
import { TM_AUTH_KEY, TM_ONBOARDED_KEY } from "@/constants/authKeys";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === "web";
  const nd = !isWeb;

  async function navigate() {
    try {
      const onboarded = await AsyncStorage.getItem(TM_ONBOARDED_KEY);
      const auth = await AsyncStorage.getItem(TM_AUTH_KEY);
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
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: nd }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: nd }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 700, useNativeDriver: nd }),
      ]),
      Animated.delay(200),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: nd }),
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
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity },
        ]}
      />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "transparent",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
    top: height / 2 - 200,
    left: width / 2 - 150,
  },
  center: {
    alignItems: "center",
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3b82f620",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: "hidden",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 1,
    marginTop: 8,
  },
  tagline: {
    fontSize: 14,
    color: "#3b82f6",
    letterSpacing: 3,
    textTransform: "uppercase",
    fontWeight: "500",
    marginTop: 4,
  },
  dotsRow: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff30",
  },
  dotActive: {
    backgroundColor: "#3b82f6",
    width: 20,
    borderRadius: 3,
  },
});
