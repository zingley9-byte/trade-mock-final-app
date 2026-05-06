/**
 * AdBanner — Platform-safe Google AdMob Banner wrapper
 *
 * • Web / browser  → renders null (no ads, no crash)
 * • Android / iOS  → renders a real BannerAd (TEST ID by default)
 *
 * Usage:
 *   <AdBanner />
 *
 * The component is intentionally tiny and dependency-free on web so the
 * published Expo web app is never affected.
 */

import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { ADS_ENABLED, BANNER_AD_UNIT_ID } from "@/config/admob";

// ── Lazy native load — only evaluated on Android / iOS ──────────────────────
// This pattern avoids importing native modules on web (which has no native
// bridge and would crash or silently fail).
let NativeBanner: React.ComponentType<{ unitId: string; size: string }> | null = null;
let BannerAdSize: Record<string, string> | null = null;

if (Platform.OS !== "web" && ADS_ENABLED) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lib = require("react-native-google-mobile-ads");
    NativeBanner = lib.BannerAd;
    BannerAdSize  = lib.BannerAdSize;
  } catch {
    // Native module unavailable (e.g. Expo Go without dev-client) — fail silently
    NativeBanner = null;
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function AdBanner() {
  // Web: always hide — AdMob only works on native builds
  if (Platform.OS === "web") return null;

  // Native module failed to load (Expo Go / dev environment)
  if (!NativeBanner || !BannerAdSize) return null;

  const Banner = NativeBanner;

  return (
    <View style={styles.wrap}>
      <Banner
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        // onAdFailedToLoad is intentionally not set — failures are silent
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 50,
    // Transparent background so the banner blends with the screen
  },
});
