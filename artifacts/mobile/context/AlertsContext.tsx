import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useTradingContext } from "./TradingContext";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PriceAlert {
  id: string;
  symbolId: string;
  symbolLabel: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
}

interface AlertsContextType {
  alerts: PriceAlert[];
  addAlert: (params: { symbolId: string; symbolLabel: string; targetPrice: number; condition: "above" | "below" }) => void;
  removeAlert: (id: string) => void;
  clearTriggered: () => void;
  notifPermission: "granted" | "denied" | "default" | "unsupported";
  requestPermission: () => Promise<void>;
  unreadCount: number;
  markAllRead: () => void;
}

const AlertsContext = createContext<AlertsContextType | null>(null);
const STORAGE_KEY = "trademock_alerts_v1";

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be inside AlertsProvider");
  return ctx;
}

// ── Expo Go detection ─────────────────────────────────────────────────────────
// Push token registration was removed from Expo Go since SDK 53.
// Even importing expo-notifications in Expo Go triggers DevicePushTokenAutoRegistration
// which crashes on Android. We skip the import entirely in Expo Go.
function isExpoGo(): boolean {
  try {
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

// ── Web Notification helper ────────────────────────────────────────────────────
function sendWebNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
  }
}

// ── Native Notification helper ─────────────────────────────────────────────────
// Only runs outside Expo Go (dev build / production)
async function sendNativeNotification(title: string, body: string) {
  if (isExpoGo()) {
    // Expo Go: push notifications not supported — alert is still tracked in-app
    console.log(`[Alert] ${title}: ${body}`);
    return;
  }
  try {
    const Notifs = await import("expo-notifications");
    await Notifs.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {}
}

// ── Unified send ──────────────────────────────────────────────────────────────
function sendNotification(title: string, body: string) {
  if (Platform.OS === "web") {
    sendWebNotification(title, body);
  } else {
    sendNativeNotification(title, body);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { symbolPrices } = useTradingContext();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState<"granted" | "denied" | "default" | "unsupported">("default");
  const checkedRef = useRef<Set<string>>(new Set());

  // ── Load persisted alerts ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setAlerts(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  // ── Persist on change ───────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)).catch(() => {});
  }, [alerts]);

  // ── Set up notifications on mount ────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotifPermission(Notification.permission as "granted" | "denied" | "default");
      } else {
        setNotifPermission("unsupported");
      }
      return;
    }

    if (isExpoGo()) {
      // Push notifications disabled in Expo Go — local in-app alerts still work
      console.log("[Notifications] Push notifications disabled in Expo Go");
      setNotifPermission("unsupported");
      return;
    }

    // Dev build / production only
    (async () => {
      try {
        const Notifs = await import("expo-notifications");

        Notifs.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status } = await Notifs.getPermissionsAsync();
        setNotifPermission(
          status === "granted" ? "granted" : status === "denied" ? "denied" : "default"
        );
      } catch {
        setNotifPermission("unsupported");
      }
    })();
  }, []);

  // ── Request permission ──────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        const p = await Notification.requestPermission();
        setNotifPermission(p as "granted" | "denied" | "default");
      }
      return;
    }
    if (isExpoGo()) return;
    try {
      const Notifs = await import("expo-notifications");
      const { status } = await Notifs.requestPermissionsAsync();
      setNotifPermission(status === "granted" ? "granted" : "denied");
    } catch {}
  }, []);

  // ── Watch live prices and fire alerts ──────────────────────────────────
  useEffect(() => {
    if (!Object.keys(symbolPrices).length) return;

    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((alert) => {
        if (alert.triggered) return alert;
        const price = symbolPrices[alert.symbolId];
        if (!price) return alert;

        const hit =
          alert.condition === "above" ? price >= alert.targetPrice : price <= alert.targetPrice;

        if (hit && !checkedRef.current.has(alert.id)) {
          checkedRef.current.add(alert.id);
          changed = true;
          const sign = alert.condition === "above" ? "▲" : "▼";
          sendNotification(
            `${sign} ${alert.symbolLabel} Alert Triggered!`,
            `Price ${alert.condition === "above" ? "reached" : "dropped to"} $${price.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
          );
          setUnreadCount((c) => c + 1);
          return { ...alert, triggered: true, triggeredAt: Date.now() };
        }
        return alert;
      });
      return changed ? next : prev;
    });
  }, [symbolPrices]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const addAlert = useCallback(({ symbolId, symbolLabel, targetPrice, condition }: {
    symbolId: string; symbolLabel: string; targetPrice: number; condition: "above" | "below";
  }) => {
    const newAlert: PriceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbolId, symbolLabel, targetPrice, condition,
      createdAt: Date.now(), triggered: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    checkedRef.current.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
    checkedRef.current.clear();
  }, []);

  const markAllRead = useCallback(() => setUnreadCount(0), []);

  return (
    <AlertsContext.Provider value={{
      alerts, addAlert, removeAlert, clearTriggered,
      notifPermission, requestPermission,
      unreadCount, markAllRead,
    }}>
      {children}
    </AlertsContext.Provider>
  );
}
