import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIF_IDS_KEY = "tm_daily_notif_ids";

function isExpoGo(): boolean {
  try { return Constants.appOwnership === "expo"; } catch { return false; }
}

// Only schedule on native non-ExpoGo builds
const isSupported = Platform.OS !== "web" && !isExpoGo();

// ── Motivational message pools ─────────────────────────────────────────────────
const MORNING_MESSAGES = [
  "Markets are open! Practice a trade today and sharpen your skills. 📈",
  "Good morning, Trader! A winning habit starts with daily practice. 🚀",
  "Rise and trade! Check today's charts and plan your strategy. 💹",
  "Morning! Smart traders start their day by reviewing the market. 🌅",
  "New day, new opportunities! Jump in and practice your trading. 💡",
  "Start strong — open Trade Mock Pro and review today's market. 🔥",
];

const EVENING_MESSAGES = [
  "Evening review time! Analyse your trades and grow stronger. 📊",
  "Great traders reflect every evening. How did your trades go today? 🌙",
  "End the day with a practice trade — every rep counts! 💪",
  "Evening check-in: Review the market and plan tomorrow's strategy. 🎯",
  "The best traders never stop learning. Practice a bit before bed! 🌟",
  "Recap your day: wins, losses, lessons. Open Trade Mock Pro now. 📋",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Android channel ────────────────────────────────────────────────────────────
export async function setupAndroidChannel(): Promise<void> {
  if (!isSupported || Platform.OS !== "android") return;
  try {
    const Notifs = await import("expo-notifications");
    await Notifs.setNotificationChannelAsync("daily-reminders", {
      name: "Daily Reminders",
      importance: Notifs.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2962FF",
    });
  } catch {}
}

// ── Permission ─────────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<"granted" | "denied" | "undetermined"> {
  if (!isSupported) return "denied";
  try {
    const Notifs = await import("expo-notifications");
    const { status } = await Notifs.requestPermissionsAsync();
    return status as "granted" | "denied" | "undetermined";
  } catch {
    return "denied";
  }
}

export async function getNotificationPermission(): Promise<"granted" | "denied" | "undetermined"> {
  if (!isSupported) return "denied";
  try {
    const Notifs = await import("expo-notifications");
    const { status } = await Notifs.getPermissionsAsync();
    return status as "granted" | "denied" | "undetermined";
  } catch {
    return "denied";
  }
}

// ── Schedule 9 AM + 7 PM daily ────────────────────────────────────────────────
export async function scheduleDailyNotifications(): Promise<void> {
  if (!isSupported) return;
  try {
    const Notifs = await import("expo-notifications");
    const { status } = await Notifs.getPermissionsAsync();
    if (status !== "granted") return;

    await cancelDailyNotifications();

    const ids: string[] = [];

    const morningId = await Notifs.scheduleNotificationAsync({
      content: {
        title: "Trade Mock Pro",
        body: pick(MORNING_MESSAGES),
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "daily-reminders" } : {}),
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.CALENDAR,
        hour: 9,
        minute: 0,
        repeats: true,
      } as any,
    });
    ids.push(morningId);

    const eveningId = await Notifs.scheduleNotificationAsync({
      content: {
        title: "Trade Mock Pro",
        body: pick(EVENING_MESSAGES),
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "daily-reminders" } : {}),
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.CALENDAR,
        hour: 19,
        minute: 0,
        repeats: true,
      } as any,
    });
    ids.push(eveningId);

    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

// ── Cancel scheduled daily notifications ──────────────────────────────────────
export async function cancelDailyNotifications(): Promise<void> {
  if (!isSupported) return;
  try {
    const Notifs = await import("expo-notifications");
    const stored = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      await Promise.all(
        ids.map((id) => Notifs.cancelScheduledNotificationAsync(id).catch(() => {}))
      );
      await AsyncStorage.removeItem(NOTIF_IDS_KEY);
    }
  } catch {}
}
