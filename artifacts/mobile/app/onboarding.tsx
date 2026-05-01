import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { TM_ONBOARDED_KEY } from "@/constants/authKeys";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    emoji: "📊",
    title: "Trade Without Risk",
    desc: "Practice real market strategies with virtual money. No losses, only learning.",
    accent: "#3b82f6",
  },
  {
    id: "2",
    emoji: "💰",
    title: "₹10,00,000 Virtual Fund",
    desc: "Start with a ₹10 lakh virtual balance. Trade crypto, NIFTY, SENSEX and more.",
    accent: "#10b981",
  },
  {
    id: "3",
    emoji: "🚀",
    title: "Become a Pro Trader",
    desc: "Track your P&L, history, and win rate. Sharpen your edge before going live.",
    accent: "#a855f7",
  },
];

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
            <View style={[styles.emojiCircle, { borderColor: item.accent + "40", shadowColor: item.accent }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: "#ffffff" }]}>{item.title}</Text>
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
    gap: 24,
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
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#ffffff25",
  },
  btnsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  skipText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
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
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
