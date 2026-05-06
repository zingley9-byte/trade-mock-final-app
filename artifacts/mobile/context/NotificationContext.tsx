import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelDailyNotifications,
  requestNotificationPermission,
  scheduleDailyNotifications,
  setupAndroidChannel,
} from "@/services/NotificationService";

const DAILY_NOTIF_KEY = "tm_daily_notif_enabled";

// ── Types ──────────────────────────────────────────────────────────────────────
type PermStatus = "granted" | "denied" | "undetermined" | "loading" | "unsupported";

interface NotificationContextType {
  dailyNotifEnabled: boolean;
  setDailyNotifEnabled: (enabled: boolean) => Promise<void>;
  permissionStatus: PermStatus;
}

// ── Context ────────────────────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [dailyNotifEnabled, setDailyNotifEnabledState] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermStatus>("loading");

  useEffect(() => {
    // Web: no local scheduled notifications — safe no-op
    if (Platform.OS === "web") {
      setPermissionStatus("unsupported");
      return;
    }

    async function init() {
      try {
        // Load persisted toggle preference (default: enabled)
        const stored = await AsyncStorage.getItem(DAILY_NOTIF_KEY);
        const enabled = stored !== null ? (JSON.parse(stored) as boolean) : true;
        setDailyNotifEnabledState(enabled);

        // Android: ensure channel exists before scheduling
        await setupAndroidChannel();

        // Ask for permission (only prompts once; subsequent calls return cached status)
        const status = await requestNotificationPermission();
        setPermissionStatus(status);

        // Schedule only if user hasn't disabled and permission is granted
        if (enabled && status === "granted") {
          await scheduleDailyNotifications();
        }
      } catch {}
    }

    init();
  }, []);

  const setDailyNotifEnabled = useCallback(async (enabled: boolean) => {
    setDailyNotifEnabledState(enabled);
    await AsyncStorage.setItem(DAILY_NOTIF_KEY, JSON.stringify(enabled));

    if (Platform.OS === "web") return;

    if (enabled) {
      const status = await requestNotificationPermission();
      setPermissionStatus(status);
      if (status === "granted") {
        await scheduleDailyNotifications();
      }
    } else {
      await cancelDailyNotifications();
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ dailyNotifEnabled, setDailyNotifEnabled, permissionStatus }}>
      {children}
    </NotificationContext.Provider>
  );
}
