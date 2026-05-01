import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const CRYPTO_URLS: Record<string, string> = {
  BTCUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/btc.png",
  ETHUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/eth.png",
  BNBUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/bnb.png",
  DOGEUSDT: "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/doge.png",
  SOLUSDT:  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/sol.png",
};

const FALLBACK_COLORS: Record<string, string> = {
  BTCUSDT: "#F7931A", ETHUSDT: "#627EEA", BNBUSDT: "#F0B90B",
  DOGEUSDT: "#C2A633", SOLUSDT: "#9945FF",
};

interface Props {
  symbolId: string;
  size?: number;
}

export default function CoinLogo({ symbolId, size = 36 }: Props) {
  const [imgError, setImgError] = useState(false);
  const radius = size / 2;

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

  const fallbackColor = FALLBACK_COLORS[symbolId] ?? "#64748b";
  const ticker = symbolId.replace("USDT", "").substring(0, 2);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: fallbackColor }]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.38 }]}>{ticker.charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#111" },
  fallback: { alignItems: "center", justifyContent: "center" },
  fallbackText: { color: "#fff", fontWeight: "700" },
});
