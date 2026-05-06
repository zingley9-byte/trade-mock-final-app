/**
 * InterstitialAdManager — Crash-safe singleton for interstitial ads
 *
 * Behaviour by environment:
 *   Web               → all methods are no-ops (never crashes)
 *   Expo Go           → all methods are no-ops (native module absent)
 *   EAS dev client    → loads and shows AdMob interstitials with cooldown
 *   Production build  → loads and shows AdMob interstitials with cooldown
 *
 * Usage:
 *   import interstitialAd from "@/components/InterstitialAdManager";
 *
 *   interstitialAd.preload();   // optional: preload after app start
 *   interstitialAd.tryShow();   // call after a position closes
 *
 * Policy:
 *   - 3-minute cooldown between consecutive interstitials
 *   - No-ops on web and Expo Go — safe to call unconditionally
 *
 * Why not try/catch around require()?
 *   The module's JS wrapper loads fine; the crash occurs when methods call the
 *   missing native module (RNGoogleMobileAdsModule). isAdMobSupported ensures
 *   we never reach those method calls in unsupported environments.
 */

import {
  isAdMobSupported,
  INTERSTITIAL_AD_UNIT_ID,
  INTERSTITIAL_COOLDOWN_MS,
} from "@/config/admob";

// ── Type stubs (avoids importing types from the native lib on all envs) ────
type AdEventCallback = () => void;
type AdInstance = {
  addAdEventListener: (event: string, cb: AdEventCallback) => () => void;
  load: () => void;
  show: () => void;
};
type AdLib = {
  InterstitialAd: {
    createForAdRequest: (
      unitId: string,
      opts?: Record<string, unknown>
    ) => AdInstance;
  };
  AdEventType: Record<string, string>;
};

// ── Lazy load (same gate as AdBanner) ────────────────────────────────────
let adLib: AdLib | null = null;

if (isAdMobSupported) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    adLib = require("react-native-google-mobile-ads") as AdLib;
  } catch {
    adLib = null;
  }
}

// ── Manager class ─────────────────────────────────────────────────────────
class InterstitialAdManager {
  private lastShownAt = 0;
  private ad: AdInstance | null = null;
  private loaded = false;
  private loading = false;

  /** Preload an interstitial so it's ready instantly on first tryShow(). */
  preload() {
    if (!this._isReady()) return;
    this._load();
  }

  /**
   * Attempt to show an interstitial.
   * Silently does nothing when:
   *   - environment is web or Expo Go
   *   - cooldown period hasn't elapsed
   *   - ad not yet loaded
   *   - native module load failed
   */
  tryShow() {
    if (!this._isReady()) return;
    const now = Date.now();
    if (now - this.lastShownAt < INTERSTITIAL_COOLDOWN_MS) return;
    if (!this.loaded || !this.ad) {
      this._load(); // kick off a load for next time
      return;
    }
    try {
      this.ad.show();
      this.lastShownAt = now;
      this.loaded = false;
      this.ad = null;
      // Preload the next one right away
      setTimeout(() => this._load(), 1000);
    } catch {
      // Swallow native errors — never crash the app over an ad
      this.loaded = false;
      this.ad = null;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /** True only when the native module is confirmed available. */
  private _isReady(): boolean {
    return isAdMobSupported && adLib !== null;
  }

  private _load() {
    if (!adLib || this.loading || this.loaded) return;
    this.loading = true;

    try {
      const { InterstitialAd, AdEventType } = adLib;

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
        // Retry after 30 s
        setTimeout(() => this._load(), 30_000);
      });

      ad.load();
      this.ad = ad;
    } catch {
      // Unexpected failure — reset state
      this.loading = false;
      this.loaded = false;
    }
  }
}

// Export as singleton
const interstitialAd = new InterstitialAdManager();
export default interstitialAd;
