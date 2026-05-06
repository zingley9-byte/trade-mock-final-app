/**
 * AdBanner — Crash-safe Google AdMob Banner wrapper
 *
 * Rendering behaviour by environment:
 *   Web               → null  (no native bridge)
 *   Expo Go           → null  (RNGoogleMobileAdsModule not bundled → would crash)
 *   EAS dev client    → real BannerAd with TEST unit ID
 *   Production build  → real BannerAd with TEST unit ID (replace before launch)
 *
 * The native module is required lazily AND only when `isAdMobSupported` is true,
 * so neither Expo Go nor web ever touch the bridge.
 */

import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { isAdMobSupported, BANNER_AD_UNIT_ID } from "@/config/admob";

// ── Lazy native module load ────────────────────────────────────────────────
// We resolve the module exactly once at module-load time, but only when we
// know the native bridge is available (isAdMobSupported).
//
// Why not a top-level import?
//   Importing react-native-google-mobile-ads at the top of the file causes
//   Metro to bundle it for all environments. When the native module
//   (RNGoogleMobileAdsModule) is absent — Expo Go, web — accessing any
//   exported symbol throws. We use require() gated on isAdMobSupported so
//   the module is never even touched in unsupported environments.
//
// Why not rely on try/catch around require()?
//   require() itself succeeds (it returns the JS wrapper). The crash happens
//   later, when the JS wrapper tries to call a method on the missing native
//   module. Gating on isAdMobSupported prevents us from ever reaching that call.

type BannerAdModule = {
  BannerAd: React.ComponentType<{ unitId: string; size: string }>;
  BannerAdSize: Record<string, string>;
};

let adMod: BannerAdModule | null = null;

if (isAdMobSupported) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adMod = require("react-native-google-mobile-ads") as BannerAdModule;
  } catch {
    // Unexpected load failure — fail silently, adMod stays null
    adMod = null;
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function AdBanner() {
  // Not supported: web, Expo Go, or module failed to load
  if (!isAdMobSupported || !adMod) return null;

  const { BannerAd, BannerAdSize } = adMod;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
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
  },
});
