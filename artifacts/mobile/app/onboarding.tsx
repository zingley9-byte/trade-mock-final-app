import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";

import { TM_ONBOARDED_KEY } from "@/constants/authKeys";

const isWeb = Platform.OS === "web";
const nd = !isWeb;

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    type: "logo",
    title: "Trade Without Risk",
    desc: "Practice real market strategies with virtual money. No losses, only learning.",
    accent: "#3b82f6",
  },
  {
    id: "2",
    type: "emoji",
    emoji: "💰",
    title: "₹10,00,000 Virtual Fund",
    desc: "Start with a ₹10 lakh virtual balance. Trade crypto, NIFTY, SENSEX and more.",
    accent: "#10b981",
  },
  {
    id: "3",
    type: "emoji",
    emoji: "🚀",
    title: "Become a Pro Trader",
    desc: "Track your P&L, history, and win rate. Sharpen your edge before going live.",
    accent: "#a855f7",
  },
];

function LogoSlide({ accent }: { accent: string }) {
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0.8)).current;
  const ring2Anim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: nd }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: nd }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: nd }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: nd }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ring1Anim, { toValue: 1.15, duration: 2200, useNativeDriver: nd }),
        Animated.timing(ring1Anim, { toValue: 0.8, duration: 2200, useNativeDriver: nd }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(ring2Anim, { toValue: 1.2, duration: 2200, useNativeDriver: nd }),
        Animated.timing(ring2Anim, { toValue: 0.6, duration: 2200, useNativeDriver: nd }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });

  return (
    <Animated.View style={[styles.logoContainer, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[styles.glowRing2, { borderColor: accent + "20", opacity: glowOpacity, transform: [{ scale: ring2Anim }] }]} />
      <Animated.View style={[styles.glowRing1, { borderColor: accent + "40", opacity: glowOpacity, transform: [{ scale: ring1Anim }] }]} />
      <Animated.View style={[styles.logoBg, { borderColor: accent + "60", shadowColor: accent }]}>
        <Image
          source={require("@/assets/images/logo_transparent.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onViewRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  );

  async function finish() {
    await AsyncStorage.setItem(TM_ONBOARDED_KEY, "true");
    router.replace("/auth");
  }

  function next() {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finish();
    }
  }

  const accent = SLIDES[activeIndex]?.accent ?? "#3b82f6";

  return (
    <LinearGradient
      colors={["#000000", "#080818", "#0a0a20", "#000000"]}
      style={styles.container}
    >
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {item.type === "logo" ? (
              <LogoSlide accent={item.accent} />
            ) : (
              <View style={[styles.emojiCircle, { borderColor: item.accent + "40", shadowColor: item.accent }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: accent }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.btnsRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={finish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: accent }]}
            onPress={next}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>
              {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 28,
  },
  logoContainer: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff08",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  logoImg: { width: 100, height: 100 },
  glowRing1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  glowRing2: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  emojiCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff08",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#fff",
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    gap: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24 },
  dotInactive: { width: 6, backgroundColor: "#ffffff25" },
  btnsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  skipText: { color: "#64748b", fontSize: 15, fontWeight: "500" },
  nextBtn: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  nextText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});
