import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTradingContext } from "@/context/TradingContext";

function playBellSound() {
  if (Platform.OS !== "web") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    function tone(freq: number, start: number, dur: number, gain: number) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start); osc.stop(start + dur);
    }
    tone(880,  now,        0.4, 0.28);
    tone(1108, now + 0.05, 0.35, 0.18);
    tone(1320, now + 0.1,  0.5,  0.22);
  } catch {}
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function TradeFlashOverlay() {
  const { tradeFlash, currentPrice, closePosition } = useTradingContext();

  const translateY = useRef(new Animated.Value(160)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const prevFlash  = useRef<typeof tradeFlash>(null);
  const [visible, setVisible] = useState(false);
  const autoTimer  = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (tradeFlash && tradeFlash !== prevFlash.current) {
      prevFlash.current = tradeFlash;
      setVisible(true);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        playBellSound();
      }

      translateY.setValue(160);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();

      clearTimeout(autoTimer.current);
      autoTimer.current = setTimeout(dismiss, 2800);
    }
  }, [tradeFlash]);

  function dismiss() {
    clearTimeout(autoTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 160, duration: 320, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 280, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }

  if (!visible || !tradeFlash) return null;

  const flash    = tradeFlash;
  const isBuy    = flash.side === "buy";
  const accent   = isBuy ? "#22c55e" : "#ef4444";
  const accentBg = isBuy ? "#22c55e18" : "#ef444418";

  const direction = isBuy ? 1 : -1;
  const rawPnl    = currentPrice > 0 && flash.entryPrice > 0
    ? direction * (currentPrice - flash.entryPrice) * flash.quantity * flash.leverage
    : 0;
  const pnlPct    = currentPrice > 0 && flash.entryPrice > 0
    ? direction * ((currentPrice - flash.entryPrice) / flash.entryPrice) * 100 * flash.leverage
    : 0;
  const pnlPos    = rawPnl >= 0;
  const pnlColor  = pnlPos ? "#22c55e" : "#ef4444";

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View style={[styles.card, { opacity, transform: [{ translateY }], borderColor: accent }]}>

        {/* ── Top: live dot + symbol + dismiss ── */}
        <View style={styles.topRow}>
          <View style={[styles.liveDot, { backgroundColor: accent }]} />
          <Text style={[styles.liveLabel, { color: accent }]}>LIVE POSITION</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.symbolText}>{flash.symbol}</Text>
          <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.dismissBtn}>
            <Text style={styles.dismissX}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Direction badge ── */}
        <View style={[styles.dirBadge, { backgroundColor: accentBg, borderColor: accent + "44" }]}>
          <Text style={[styles.dirText, { color: accent }]}>
            {isBuy ? "▲  LONG" : "▼  SHORT"}
          </Text>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Entry</Text>
            <Text style={styles.statValue}>${fmt(flash.entryPrice)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>PnL</Text>
            <Text style={[styles.pnlBig, { color: pnlColor }]}>
              {pnlPos ? "+" : ""}{pnlPct.toFixed(2)}%
            </Text>
            <Text style={[styles.pnlSub, { color: pnlColor }]}>
              {pnlPos ? "+" : "-"}${fmt(Math.abs(rawPnl))}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Leverage</Text>
            <Text style={styles.statValue}>{flash.leverage}×</Text>
            <Text style={styles.statSub}>{flash.quantity} lot</Text>
          </View>
        </View>

        {/* ── Buttons ── */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnClose} onPress={dismiss}>
            <Text style={styles.btnCloseText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnModify} onPress={dismiss}>
            <Text style={styles.btnModifyText}>Modify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnExit}
            onPress={() => { closePosition(flash.positionId); dismiss(); }}
          >
            <Text style={styles.btnExitText}>Exit Trade</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 90,
    zIndex: 9999,
  },
  card: {
    width: 340,
    backgroundColor: "#0f1420",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  symbolText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    marginRight: 8,
  },
  dismissBtn: { padding: 2 },
  dismissX: { fontSize: 13, color: "#4b5563", fontWeight: "700" },

  dirBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  dirText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#161d2f",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#1e293b",
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  statSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
  },
  pnlBig: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  pnlSub: {
    fontSize: 10,
    fontWeight: "700",
  },

  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnClose: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  btnCloseText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
  },
  btnModify: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
  },
  btnModifyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60a5fa",
  },
  btnExit: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#3f1010",
    borderWidth: 1,
    borderColor: "#ef4444aa",
    alignItems: "center",
  },
  btnExitText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ef4444",
  },
});
