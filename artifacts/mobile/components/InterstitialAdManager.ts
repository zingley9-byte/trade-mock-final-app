/**
 * InterstitialAdManager — Platform-safe singleton for interstitial ads
 *
 * • Web / browser  → all methods are no-ops (never crashes)
 * • Android / iOS  → loads and shows AdMob interstitials with a cooldown
 *
 * Usage:
 *   import interstitialAd from "@/components/InterstitialAdManager";
 *
 *   // Preload after app start (optional — speeds up first show)
 *   interstitialAd.preload();
 *
 *   // Show after an event (e.g. position closed)
 *   interstitialAd.tryShow();
 *
 * Policy:
 *   - Minimum 3 minutes between consecutive interstitials (INTERSTITIAL_COOLDOWN_MS)
 *   - Only shown on native builds; silently skipped on web and Expo Go
 */

import { Platform } from "react-native";
import { ADS_ENABLED, INTERSTITIAL_AD_UNIT_ID, INTERSTITIAL_COOLDOWN_MS } from "@/config/admob";

class InterstitialAdManager {
  private lastShownAt = 0;
  private ad: any = null;
  private loaded = false;
  private loading = false;

  /** Preload an interstitial so it's ready instantly when needed. */
  preload() {
    if (!this._isSupported()) return;
    this._load();
  }

  /**
   * Try to show an interstitial ad.
   * Silently does nothing if:
   *   - running on web
   *   - cooldown period hasn't elapsed
   *   - ad not yet loaded
   *   - native module unavailable
   */
  tryShow() {
    if (!this._isSupported()) return;
    const now = Date.now();
    if (now - this.lastShownAt < INTERSTITIAL_COOLDOWN_MS) return;
    if (!this.loaded || !this.ad) {
      // Not ready yet — start loading so next call may succeed
      this._load();
      return;
    }
    try {
      this.ad.show();
      this.lastShownAt = now;
      this.loaded = false;
      this.ad = null;
      // Preload next ad immediately after showing
      setTimeout(() => this._load(), 1000);
    } catch {
      // Swallow any native errors — never crash the app over an ad
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _isSupported(): boolean {
    return Platform.OS !== "web" && ADS_ENABLED;
  }

  private _load() {
    if (this.loading || this.loaded) return;
    this.loading = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { InterstitialAd, AdEventType } =
        require("react-native-google-mobile-ads");

      const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        this.loaded = true;
        this.loading = false;
        unsubLoaded();
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        this.loaded = false;
        this.loading = false;
        unsubError();
        // Retry after 30 s on failure
        setTimeout(() => this._load(), 30_000);
      });

      ad.load();
      this.ad = ad;
    } catch {
      // Native module unavailable (Expo Go / web dev build) — fail silently
      this.loading = false;
    }
  }
}

// Export as singleton
const interstitialAd = new InterstitialAdManager();
export default interstitialAd;
