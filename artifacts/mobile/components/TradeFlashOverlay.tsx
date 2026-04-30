import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTradingContext } from "@/context/TradingContext";
import { useColors } from "@/hooks/useColors";

function playBellSound() {
  if (Platform.OS !== "web") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    function tone(freq: number, start: number, dur: number, gain: number) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    }

    tone(880, now, 0.4, 0.3);
    tone(1108, now + 0.05, 0.35, 0.2);
    tone(1320, now + 0.1, 0.5, 0.25);
  } catch {}
}

export default function TradeFlashOverlay() {
  const { tradeFlash } = useTradingContext();
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const prevFlash = useRef<typeof tradeFlash>(null);

  useEffect(() => {
    if (tradeFlash && tradeFlash !== prevFlash.current) {
      prevFlash.current = tradeFlash;

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        playBellSound();
      }

      opacity.setValue(0);
      scale.setValue(0.7);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.85,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start();
        }, 2400);
      });
    }
  }, [tradeFlash]);

  if (!tradeFlash) return null;

  const isBuy = tradeFlash.side === "buy";

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity }]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale }],
            borderColor: isBuy ? "#22c55e" : "#ef4444",
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={[styles.iconRow, { backgroundColor: isBuy ? "#22c55e18" : "#ef444418" }]}>
          <Text style={styles.icon}>{isBuy ? "🚀" : "📉"}</Text>
        </View>
        <Text style={[styles.title, { color: isBuy ? "#22c55e" : "#ef4444" }]}>
          Your Position is Running!
        </Text>
        <Text style={styles.symbol}>{tradeFlash.symbol}</Text>
        <View style={[styles.badge, { backgroundColor: isBuy ? "#22c55e" : "#ef4444" }]}>
          <Text style={styles.badgeText}>
            {isBuy ? "▲ LONG" : "▼ SHORT"}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.35)",
    pointerEvents: "none" as any,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
    minWidth: 220,
  },
  iconRow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  icon: { fontSize: 32 },
  title: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  symbol: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
