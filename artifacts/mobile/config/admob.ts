/**
 * AdMob Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * CURRENT STATE: Google TEST Ad IDs only.
 * These IDs are safe to use during development — they show test ads and
 * will NOT generate real revenue or violate AdMob policy.
 *
 * BEFORE PLAY STORE LAUNCH:
 *   1. Create your AdMob account at https://admob.google.com
 *   2. Create an Android App in AdMob → get your real App ID
 *   3. Create Ad Units (Banner, Interstitial) → get real Ad Unit IDs
 *   4. Set the real App IDs in your environment:
 *        ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
 *        ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
 *   5. Replace the TEST unit IDs below with your real Ad Unit IDs.
 *   6. Rebuild with EAS Build: `eas build --platform android`
 *
 * POLICY REMINDERS:
 *   - Never click your own ads.
 *   - Do not place ads on splash/loading screens.
 *   - Do not place ads where users may accidentally click.
 *   - Maximum 1 banner per screen, interstitial max 1 per 3 minutes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

// ── Environment detection ──────────────────────────────────────────────────
/**
 * True when running inside Expo Go (the public sandbox app from the App Store).
 *
 * Expo Go does NOT support custom native modules — react-native-google-mobile-ads
 * requires a native build (EAS Build dev client or production APK/IPA).
 * Calling any of its methods in Expo Go throws:
 *   "RNGoogleMobileAdsModule could not be found"
 *
 * Detection:
 *   ExecutionEnvironment.StoreClient === 'storeClient'  → Expo Go
 *   ExecutionEnvironment.Bare        === 'bare'         → dev client / standalone
 *
 * Legacy fallback: Constants.appOwnership === 'expo' also identifies Expo Go.
 */
export const isExpoGo: boolean =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === "expo";

/** Master switch — flip to false to disable all ads globally. */
export const ADS_ENABLED = true;

/**
 * True only when it is safe to use react-native-google-mobile-ads.
 * AdMob requires:
 *   1. A native platform (not web — no native bridge on web)
 *   2. A native build (not Expo Go — native module not bundled in Expo Go)
 *   3. ADS_ENABLED flag is on
 */
export const isAdMobSupported: boolean =
  Platform.OS !== "web" && !isExpoGo && ADS_ENABLED;

// ── App IDs (set in app.config.js via env vars) ───────────────────────────
// These are Google's official TEST App IDs. Replace with real IDs for launch.
export const ADMOB_ANDROID_APP_ID =
  process.env.ADMOB_ANDROID_APP_ID ||
  "ca-app-pub-3940256099942544~3347511713"; // ← REPLACE with real Android App ID

export const ADMOB_IOS_APP_ID =
  process.env.ADMOB_IOS_APP_ID ||
  "ca-app-pub-3940256099942544~1458002511"; // ← REPLACE with real iOS App ID

// ── Banner Ad Unit IDs ─────────────────────────────────────────────────────
// Google TEST Banner IDs — replace with real Ad Unit IDs before launch.
const BANNER_ANDROID = "ca-app-pub-3940256099942544/6300978111"; // ← REPLACE
const BANNER_IOS     = "ca-app-pub-3940256099942544/2934735716"; // ← REPLACE

export const BANNER_AD_UNIT_ID: string =
  Platform.OS === "ios" ? BANNER_IOS : BANNER_ANDROID;

// ── Interstitial Ad Unit IDs ───────────────────────────────────────────────
// Google TEST Interstitial IDs — replace with real Ad Unit IDs before launch.
const INTERSTITIAL_ANDROID = "ca-app-pub-3940256099942544/1033173712"; // ← REPLACE
const INTERSTITIAL_IOS     = "ca-app-pub-3940256099942544/4411468910"; // ← REPLACE

export const INTERSTITIAL_AD_UNIT_ID: string =
  Platform.OS === "ios" ? INTERSTITIAL_IOS : INTERSTITIAL_ANDROID;

// ── Ad display policy settings ─────────────────────────────────────────────
/** Minimum milliseconds between two interstitial ads (3 minutes). */
export const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
