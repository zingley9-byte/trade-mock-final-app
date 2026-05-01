import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

// ─── Crypto logos via jsDelivr CDN (cryptocurrency-icons package) ─────────
const CRYPTO_URLS: Record<string, string> = {
  BTCUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/btc.png",
  ETHUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/eth.png",
  BNBUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/bnb.png",
  DOGEUSDT: "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/doge.png",
  SOLUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/sol.png",
};

// ─── Indian index badge config ────────────────────────────────────────────
const INDIAN_CONFIGS: Record<string, {
  label: string;  // Short label on badge
  bg: string;     // Badge background
  fg: string;     // Text colour
  accent: string; // Stripe / dot colour
  exchange: string;
}> = {
  NIFTY50:   { label: "N50",  bg: "#0A2463", fg: "#FFFFFF", accent: "#FF6B00", exchange: "NSE" },
  BANKNIFTY: { label: "BNF",  bg: "#0A2463", fg: "#FFFFFF", accent: "#00C2D4", exchange: "NSE" },
  SENSEX:    { label: "BSX",  bg: "#7B0000", fg: "#FFFFFF", accent: "#FFD700", exchange: "BSE" },
  BANKEX:    { label: "BEX",  bg: "#7B0000", fg: "#FFFFFF", accent: "#FF9F1C", exchange: "BSE" },
};

// ─── Fallback letter colours ──────────────────────────────────────────────
const FALLBACK_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A", ETHUSDT: "#627EEA", BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633", SOLUSDT: "#9945FF",
  NIFTY50: "#1a7ef7", SENSEX: "#e84040",
  BANKNIFTY: "#16a34a", BANKEX: "#7c3aed",
};

interface Props {
  symbolId: string;
  size?: number;
}

export default function CoinLogo({ symbolId, size = 36 }: Props) {
  const [imgError, setImgError] = useState(false);
  const radius = size / 2;

  // ── Crypto coin logo ──────────────────────────────────────────────────
  const cryptoUrl = CRYPTO_URLS[symbolId];
  if (cryptoUrl && !imgError) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
        <Image
          source={{ uri: cryptoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setImgError(true)}
          resizeMode="contain"
        />
      </View>
    );
  }

  // ── Indian index badge ────────────────────────────────────────────────
  const indian = INDIAN_CONFIGS[symbolId];
  if (indian) {
    const labelSize = size * 0.28;
    const exSize   = size * 0.22;
    return (
      <View style={[
        styles.indianWrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: indian.bg },
      ]}>
        {/* Accent stripe at top */}
        <View style={[styles.stripe, { backgroundColor: indian.accent, height: size * 0.18 }]} />
        {/* Exchange label */}
        <Text style={[styles.exchangeLabel, { fontSize: exSize, color: indian.accent }]}>
          {indian.exchange}
        </Text>
        {/* Index short name */}
        <Text style={[styles.indexLabel, { fontSize: labelSize, color: indian.fg }]}>
          {indian.label}
        </Text>
      </View>
    );
  }

  // ── Generic fallback (first letter) ──────────────────────────────────
  const fallbackColor = FALLBACK_COLORS[symbolId] ?? "#64748b";
  const ticker = symbolId.replace("USDT", "").replace("50", "").substring(0, 2);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: fallbackColor }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>{ticker.charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#111" },

  // Indian badge
  indianWrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 3,
  },
  stripe: { position: "absolute", top: 0, left: 0, right: 0 },
  exchangeLabel: { fontWeight: "800", letterSpacing: 0.3, lineHeight: undefined },
  indexLabel: { fontWeight: "900", letterSpacing: 0.5 },

  // Fallback
  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "#fff", fontWeight: "700" },
});
