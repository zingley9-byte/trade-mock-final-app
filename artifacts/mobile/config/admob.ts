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

/** Screens where ads are allowed (others show nothing). */
export const ADS_ENABLED = true;
