/**
 * LoadingCandleAnimation — Reusable professional loading screen
 * Animated red/green candlesticks + Trade Mock logo + status message
 * Works on iOS, Android, and Web (React Native Animated API)
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type LoadStatus = "loading" | "connecting" | "reconnecting" | "error";

interface Props {
  status?: LoadStatus;
  message?: string;
  overlay?: boolean;      // absolute fill over parent container
  transparent?: boolean;  // semi-transparent bg (good for overlay mode)
  size?: "sm" | "md" | "lg";
}

const GREEN = "#22c55e";
const RED   = "#ef4444";
const AMBER = "#f59e0b";
const GOLD  = "#f0b90b";
const BG    = "#0a0a14";
const ND    = Platform.OS !== "web"; // useNativeDriver

// 9 candles: alternating green/red with varied heights and staggered delays
const CANDLES = [
  { green: true,  body: 38, wt: 10, wb:  8, delay:   0, amp: 14 },
  { green: false, body: 26, wt:  8, wb: 12, delay: 140, amp: 18 },
  { green: true,  body: 48, wt: 14, wb:  6, delay: 280, amp: 11 },
  { green: false, body: 20, wt:  6, wb: 16, delay: 420, amp: 20 },
  { green: true,  body: 42, wt: 12, wb: 10, delay:  70, amp: 15 },
  { green: false, body: 30, wt: 10, wb:  8, delay: 210, amp: 17 },
  { green: true,  body: 34, wt:  8, wb: 14, delay: 350, amp: 13 },
  { green: false, body: 46, wt: 16, wb:  6, delay: 490, amp: 12 },
  { green: true,  body: 24, wt:  6, wb: 10, delay: 175, amp: 19 },
] as const;

export default function LoadingCandleAnimation({
  status = "loading",
  message,
  overlay = false,
  transparent = false,
  size = "md",
}: Props) {
  const anims = useRef(CANDLES.map(() => new Animated.Value(0))).current;
  const [dots, setDots] = useState("");

  const sc = size === "sm" ? 0.52 : size === "lg" ? 1.1 : 0.78;
  const W  = Math.round(10 * sc);
  const G  = Math.round(5  * sc);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 480);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const { delay, amp } = CANDLES[i];
      const a = amp * sc;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -a,  duration: 520, useNativeDriver: ND }),
          Animated.timing(anim, { toValue:  a,  duration: 520, useNativeDriver: ND }),
          Animated.timing(anim, { toValue:  0,  duration: 440, useNativeDriver: ND }),
        ])
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [sc]);

  const statusMsg = (() => {
    if (message) return message;
    if (status === "reconnecting") return "Network slow. Reconnecting";
    if (status === "error")        return "Connection lost. Retrying";
    if (status === "connecting")   return "Connecting to market";
    return "Loading market data";
  })();

  const msgColor =
    status === "error"        ? RED   :
    status === "reconnecting" ? AMBER :
    GOLD;

  return (
    <View
      style={[
        st.base,
        overlay    ? st.overlay   : st.fill,
        transparent ? st.semiTrans : st.opaque,
      ]}
    >
      {/* Logo */}
      <View style={st.logoWrap}>
        <Image
          source={require("@/assets/images/logo_transparent.png")}
          style={[
            st.logo,
            {
              width:        Math.round(60 * sc),
              height:       Math.round(60 * sc),
              borderRadius: Math.round(30 * sc),
            },
          ]}
          resizeMode="contain"
        />
        <Text style={[st.logoTxt, { fontSize: Math.round(22 * sc) }]}>
          Trade Mock
        </Text>
      </View>

      {/* Candlestick animation row */}
      <View style={[st.row, { height: Math.round(100 * sc), marginTop: Math.round(24 * sc) }]}>
        {CANDLES.map((c, i) => {
          const color = c.green ? GREEN : RED;
          return (
            <Animated.View
              key={i}
              style={[
                st.candleWrap,
                { width: W, marginHorizontal: Math.round(G / 2), transform: [{ translateY: anims[i] }] },
              ]}
            >
              {/* Top wick */}
              <View style={[st.wick, { height: Math.round(c.wt * sc), backgroundColor: color }]} />
              {/* Body */}
              <View
                style={[
                  st.body,
                  {
                    height:       Math.round(c.body * sc),
                    backgroundColor: color,
                    width:        W,
                    borderRadius: Math.round(2 * sc),
                  },
                ]}
              />
              {/* Bottom wick */}
              <View style={[st.wick, { height: Math.round(c.wb * sc), backgroundColor: color }]} />
            </Animated.View>
          );
        })}
      </View>

      {/* Status message with animated dots */}
      <Text
        style={[
          st.msg,
          { color: msgColor, marginTop: Math.round(20 * sc), fontSize: Math.round(13 * sc) },
        ]}
      >
        {statusMsg}{dots}
      </Text>

      {/* Sub-hint for slow / lost connection */}
      {(status === "reconnecting" || status === "error") && (
        <Text style={[st.sub, { fontSize: Math.round(11 * sc) }]}>
          Auto-retrying connection
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  base:      { alignItems: "center", justifyContent: "center" },
  fill:      { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  opaque:    { backgroundColor: BG },
  semiTrans: { backgroundColor: "rgba(10,10,20,0.94)" },
  logoWrap:  { alignItems: "center", gap: 10 },
  logo: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoTxt:   { color: "#ffffff", fontWeight: "800", letterSpacing: 1 },
  row:       { flexDirection: "row", alignItems: "flex-end" },
  candleWrap:{ alignItems: "center" },
  wick:      { width: 2, alignSelf: "center" },
  body:      {},
  msg:       { fontWeight: "600", letterSpacing: 0.5, textAlign: "center" },
  sub:       { color: "#64748b", marginTop: 5, textAlign: "center" },
});
