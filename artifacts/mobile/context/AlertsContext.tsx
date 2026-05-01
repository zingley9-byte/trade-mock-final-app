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
import { useTradingContext } from "./TradingContext";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PriceAlert {
  id: string;
  symbolId: string;       // e.g. "BTCUSDT"
  symbolLabel: string;    // e.g. "BTC/USDT"
  targetPrice: number;    // in USD
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

// ── Notification helper (web + native) ────────────────────────────────────────
async function sendNotification(title: string, body: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
    }
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

  // ── Detect permission on mount ──────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        setNotifPermission(Notification.permission as any);
      } else {
        setNotifPermission("unsupported");
      }
    } else {
      (async () => {
        try {
          const Notifs = await import("expo-notifications");
          const { status } = await Notifs.getPermissionsAsync();
          setNotifPermission(status === "granted" ? "granted" : status === "denied" ? "denied" : "default");
        } catch { setNotifPermission("unsupported"); }
      })();
    }
  }, []);

  // ── Request permission ──────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && "Notification" in window) {
        const p = await Notification.requestPermission();
        setNotifPermission(p as any);
      }
      return;
    }
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
