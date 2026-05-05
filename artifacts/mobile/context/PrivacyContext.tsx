import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as ScreenCapture from "expo-screen-capture";

const PRIVACY_KEY = "tm_privacy_v2";
const PIN_KEY     = "tm_privacy_pin";

export interface PrivacySettings {
  appLock:              boolean;
  biometric:            boolean;
  hideBalance:          boolean;
  screenshotProtection: boolean;
}

const DEFAULT: PrivacySettings = {
  appLock:              false,
  biometric:            false,
  hideBalance:          false,
  screenshotProtection: false,
};

interface PrivacyContextType {
  privacy:             PrivacySettings;
  isLocked:            boolean;
  hasPin:              boolean;
  biometricAvailable:  boolean;
  enableAppLock:       (pin: string) => Promise<void>;
  disableAppLock:      (currentPin: string) => Promise<{ ok: boolean; error?: string }>;
  enableBiometric:     () => Promise<{ ok: boolean; error?: string }>;
  disableBiometric:    () => void;
  setHideBalance:           (v: boolean) => void;
  setScreenshotProtection:  (v: boolean) => void;
  verifyPin:           (pin: string) => Promise<boolean>;
  biometricUnlock:     () => Promise<boolean>;
  lockNow:             () => void;
}

const PrivacyContext = createContext<PrivacyContextType | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacy, setPrivacy]                       = useState<PrivacySettings>(DEFAULT);
  const [isLocked, setIsLocked]                     = useState(false);
  const [hasPin, setHasPin]                         = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const appStateRef       = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const privacyRef        = useRef<PrivacySettings>(DEFAULT);
  const hasPinRef         = useRef(false);

  privacyRef.current = privacy;
  hasPinRef.current  = hasPin;

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [stored, pin] = await Promise.all([
        AsyncStorage.getItem(PRIVACY_KEY),
        AsyncStorage.getItem(PIN_KEY),
      ]);
      const settings: PrivacySettings = stored ? JSON.parse(stored) : DEFAULT;
      setPrivacy(settings);
      setHasPin(!!pin);

      if (Platform.OS !== "web") {
        try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled   = await LocalAuthentication.isEnrolledAsync();
          setBiometricAvailable(compatible && enrolled);
        } catch {}
      }
    }
    load();
  }, []);

  // ── Screenshot protection ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (privacy.screenshotProtection) {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    }
  }, [privacy.screenshotProtection]);

  // ── AppState — lock when foregrounded after background ────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === "active" && (next === "background" || next === "inactive")) {
        backgroundTimeRef.current = Date.now();
      }

      if (next === "active" && prev !== "active") {
        const elapsed = backgroundTimeRef.current
          ? Date.now() - backgroundTimeRef.current
          : 0;
        if (privacyRef.current.appLock && hasPinRef.current && elapsed > 3000) {
          setIsLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Persist helper ─────────────────────────────────────────────────────────
  async function persist(next: PrivacySettings) {
    setPrivacy(next);
    await AsyncStorage.setItem(PRIVACY_KEY, JSON.stringify(next));
  }

  // ── PIN ────────────────────────────────────────────────────────────────────
  const enableAppLock = useCallback(async (pin: string) => {
    await AsyncStorage.setItem(PIN_KEY, pin);
    setHasPin(true);
    await persist({ ...privacyRef.current, appLock: true });
    setIsLocked(false);
  }, []);

  const disableAppLock = useCallback(async (
    currentPin: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (stored !== currentPin) return { ok: false, error: "Wrong PIN" };
    await AsyncStorage.removeItem(PIN_KEY);
    setHasPin(false);
    await persist({ ...privacyRef.current, appLock: false, biometric: false });
    setIsLocked(false);
    return { ok: true };
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (stored === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  // ── Biometric ──────────────────────────────────────────────────────────────
  const enableBiometric = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (Platform.OS === "web")   return { ok: false, error: "Not supported on web" };
    if (!biometricAvailable)     return { ok: false, error: "No biometric enrolled on this device" };
    if (!privacyRef.current.appLock) return { ok: false, error: "Enable App Lock PIN first" };

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirm to enable biometric unlock",
      cancelLabel:   "Cancel",
      disableDeviceFallback: false,
    });
    if (!result.success) return { ok: false, error: "Biometric confirmation cancelled" };
    await persist({ ...privacyRef.current, biometric: true });
    return { ok: true };
  }, [biometricAvailable]);

  const disableBiometric = useCallback(() => {
    persist({ ...privacyRef.current, biometric: false });
  }, []);

  const biometricUnlock = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Trade Mock",
        fallbackLabel: "Use PIN",
        cancelLabel:   "Cancel",
        disableDeviceFallback: false,
      });
      if (result.success) { setIsLocked(false); return true; }
    } catch {}
    return false;
  }, []);

  // ── Simple toggles ─────────────────────────────────────────────────────────
  const setHideBalance = useCallback((v: boolean) => {
    persist({ ...privacyRef.current, hideBalance: v });
  }, []);

  const setScreenshotProtection = useCallback((v: boolean) => {
    persist({ ...privacyRef.current, screenshotProtection: v });
  }, []);

  const lockNow = useCallback(() => {
    if (privacyRef.current.appLock && hasPinRef.current) setIsLocked(true);
  }, []);

  return (
    <PrivacyContext.Provider value={{
      privacy, isLocked, hasPin, biometricAvailable,
      enableAppLock, disableAppLock,
      enableBiometric, disableBiometric,
      setHideBalance, setScreenshotProtection,
      verifyPin, biometricUnlock, lockNow,
    }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be inside PrivacyProvider");
  return ctx;
}
