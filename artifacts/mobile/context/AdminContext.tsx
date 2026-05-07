import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDoc, increment, getDocs,
} from "firebase/firestore";

export const ADMIN_EMAIL = "Zingley9@gmail.com";

export type UserRole = "admin" | "user";

export interface PositionSnapshot {
  id:          string;
  symbolId:    string;
  symbolLabel: string;
  symbolName:  string;
  side:        "buy" | "sell";
  entryPrice:  number;
  quantity:    number;
  margin:      number;
  openedAt:    number;
  leverage:    number;
}

export interface CustomCoin {
  id:    string;
  name:  string;
  label: string;
}

export interface AdminTradeRecord {
  id: string;
  symbolId: string;
  symbolLabel: string;
  symbolName: string;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  pnl: number;
  pnlPct: number;
  openedAt: number;
  closedAt: number;
  margin: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  balance: number;
  blocked: boolean;
  createdAt: number;
  tradeCount: number;
  totalPnl: number;
  role: UserRole;
  lastSeen?: number;
  needsReset?: boolean;
  fakeBalanceAdded?: number;
  pendingFundAdd?: number;
  openPositions?: PositionSnapshot[];
  openTradeCount?: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  createdAt: number;
  active: boolean;
}

export interface AppConfig {
  bannerAds: boolean;
  interstitialAds: boolean;
  rewardedAds: boolean;
  maintenanceMode: boolean;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
}

const DEFAULT_CONFIG: AppConfig = {
  bannerAds: true,
  interstitialAds: true,
  rewardedAds: true,
  maintenanceMode: false,
  bannerAdUnitId: "ca-app-pub-xxxxxx/yyyyyy",
  interstitialAdUnitId: "ca-app-pub-xxxxxx/zzzzzz",
  rewardedAdUnitId: "ca-app-pub-xxxxxx/wwwwww",
};

function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

interface AdminContextType {
  isAdmin: boolean;
  role: UserRole | null;
  adminEmail: string | null;
  users: AdminUser[];
  usersError: string | null;
  announcements: Announcement[];
  blockedUids: string[];
  appConfig: AppConfig;
  loading: boolean;
  refreshUsers: () => Promise<void>;
  blockUser: (uid: string) => Promise<void>;
  unblockUser: (uid: string) => Promise<void>;
  addFakeBalance: (uid: string, amount: number) => Promise<void>;
  resetUserFund: (uid: string) => Promise<void>;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  updateAppConfig: (updates: Partial<AppConfig>) => Promise<void>;
  registerUserActivity: (
    uid: string, email: string, name: string,
    balance: number, tradeCount: number, totalPnl: number
  ) => Promise<void>;
  checkAndApplyAdminReset: (uid: string, applyReset: () => void) => Promise<void>;
  checkAndApplyAdminFundAdd: (uid: string, applyFundAdd: (amount: number) => void) => Promise<void>;
  getUserTrades: (uid: string) => Promise<AdminTradeRecord[]>;
  customCoins: CustomCoin[];
  addCustomCoin: (coin: CustomCoin) => Promise<void>;
  removeCustomCoin: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin]         = useState(false);
  const [role, setRole]               = useState<UserRole | null>(null);
  const [adminEmail, setAdminEmail]   = useState<string | null>(null);
  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [usersError, setUsersError]   = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [appConfig, setAppConfig]     = useState<AppConfig>(DEFAULT_CONFIG);
  const [customCoins, setCustomCoins] = useState<CustomCoin[]>([]);
  const [loading, setLoading]         = useState(true);

  const usersUnsubRef         = useRef<(() => void) | null>(null);
  const announcementsUnsubRef = useRef<(() => void) | null>(null);
  const configUnsubRef        = useRef<(() => void) | null>(null);
  const coinsUnsubRef         = useRef<(() => void) | null>(null);

  // Auth state + users subscription — kept together so users subscription
  // is (re-)set up with a valid auth token, never before login.
  useEffect(() => {
    const auth = getFirebaseAuth();
    const db   = getFirebaseDb();

    const unsub = onAuthStateChanged(auth, (user) => {
      const email = user?.email ?? null;
      const admin = isAdminEmail(email);
      setAdminEmail(email);
      setIsAdmin(admin);
      setRole(email ? (admin ? "admin" : "user") : null);
      setLoading(false);

      // Tear down any existing users subscription then re-establish with fresh token
      usersUnsubRef.current?.();
      setUsersError(null);
      if (user) {
        usersUnsubRef.current = onSnapshot(
          query(collection(db, "users"), orderBy("createdAt", "desc")),
          (snap) => {
            const list: AdminUser[] = [];
            snap.forEach((d) => list.push(d.data() as AdminUser));
            setUsers(list);
            setUsersError(null);
          },
          (err) => {
            setUsersError(
              err.code === "permission-denied"
                ? "Firestore permission denied — apply the updated rules in FIRESTORE_RULES.txt via Firebase Console."
                : err.message
            );
          }
        );
      } else {
        setUsers([]);
      }
    });

    return () => {
      unsub();
      usersUnsubRef.current?.();
    };
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();

    // Announcements stored in admin_config/announcements doc (same collection as app/coins)
    announcementsUnsubRef.current?.();
    announcementsUnsubRef.current = onSnapshot(
      doc(db, "admin_config", "announcements"),
      (snap) => {
        if (snap.exists()) {
          const items = (snap.data()?.items as Announcement[]) ?? [];
          setAnnouncements([...items].sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setAnnouncements([]);
        }
      },
      () => {}
    );

    configUnsubRef.current?.();
    configUnsubRef.current = onSnapshot(
      doc(db, "admin_config", "app"),
      (snap) => {
        if (snap.exists()) {
          setAppConfig({ ...DEFAULT_CONFIG, ...(snap.data() as Partial<AppConfig>) });
        }
      },
      () => {}
    );

    // Custom coins stored in admin_config/coins doc as items array
    coinsUnsubRef.current?.();
    coinsUnsubRef.current = onSnapshot(
      doc(db, "admin_config", "coins"),
      (snap) => {
        if (snap.exists()) setCustomCoins((snap.data()?.items as CustomCoin[]) ?? []);
        else setCustomCoins([]);
      },
      () => {}
    );

    return () => {
      announcementsUnsubRef.current?.();
      configUnsubRef.current?.();
      coinsUnsubRef.current?.();
    };
  }, []);

  async function refreshUsers() {
    const db = getFirebaseDb();
    const snap = await import("firebase/firestore").then(({ getDocs, collection, query, orderBy: ob }) =>
      getDocs(query(collection(db, "users"), ob("createdAt", "desc")))
    );
    const list: AdminUser[] = [];
    snap.forEach((d) => list.push(d.data() as AdminUser));
    setUsers(list);
  }

  const blockedUids = users.filter((u) => u.blocked).map((u) => u.uid);

  async function blockUser(uid: string) {
    const userToBlock = users.find((u) => u.uid === uid);
    if (userToBlock && isAdminEmail(userToBlock.email)) return;
    const db = getFirebaseDb();
    await updateDoc(doc(db, "users", uid), { blocked: true });
  }

  async function unblockUser(uid: string) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "users", uid), { blocked: false });
  }

  async function addFakeBalance(uid: string, amount: number) {
    const db = getFirebaseDb();
    const userDoc = users.find((u) => u.uid === uid);
    const currentBal = userDoc?.balance ?? 0;
    const currentFake = userDoc?.fakeBalanceAdded ?? 0;
    await updateDoc(doc(db, "users", uid), {
      balance: currentBal + amount,
      fakeBalanceAdded: currentFake + amount,
      pendingFundAdd: increment(amount),
    });
  }

  async function resetUserFund(uid: string) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "users", uid), {
      balance: 50000,
      tradeCount: 0,
      totalPnl: 0,
      fakeBalanceAdded: 0,
      needsReset: true,
    });
  }

  async function checkAndApplyAdminReset(uid: string, applyReset: () => void) {
    try {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists() && snap.data()?.needsReset === true) {
        applyReset();
        await updateDoc(doc(db, "users", uid), { needsReset: false });
      }
    } catch {}
  }

  async function getUserTrades(uid: string): Promise<AdminTradeRecord[]> {
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(
        query(collection(db, "users", uid, "trades"), orderBy("closedAt", "desc"))
      );
      const list: AdminTradeRecord[] = [];
      snap.forEach((d) => list.push(d.data() as AdminTradeRecord));
      return list;
    } catch {
      return [];
    }
  }

  async function checkAndApplyAdminFundAdd(uid: string, applyFundAdd: (amount: number) => void) {
    try {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const pending = snap.data()?.pendingFundAdd ?? 0;
        if (pending > 0) {
          applyFundAdd(pending);
          await updateDoc(doc(db, "users", uid), { pendingFundAdd: 0 });
        }
      }
    } catch {}
  }

  // Announcements stored in admin_config/announcements doc — errors propagate to caller
  async function addAnnouncement(a: Omit<Announcement, "id" | "createdAt">) {
    const db   = getFirebaseDb();
    const ref  = doc(db, "admin_config", "announcements");
    const snap = await getDoc(ref);
    const existing: Announcement[] = snap.exists() ? ((snap.data()?.items as Announcement[]) ?? []) : [];
    const newItem: Announcement = { ...a, id: Date.now().toString(), createdAt: Date.now() };
    await setDoc(ref, { items: [...existing, newItem] });
  }

  async function updateAnnouncement(id: string, updates: Partial<Announcement>) {
    const db   = getFirebaseDb();
    const ref  = doc(db, "admin_config", "announcements");
    const snap = await getDoc(ref);
    const items: Announcement[] = snap.exists() ? ((snap.data()?.items as Announcement[]) ?? []) : [];
    const updated = items.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await setDoc(ref, { items: updated });
  }

  async function deleteAnnouncement(id: string) {
    const db   = getFirebaseDb();
    const ref  = doc(db, "admin_config", "announcements");
    const snap = await getDoc(ref);
    const items: Announcement[] = snap.exists() ? ((snap.data()?.items as Announcement[]) ?? []) : [];
    await setDoc(ref, { items: items.filter((a) => a.id !== id) });
  }

  async function addCustomCoin(coin: CustomCoin) {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "admin_config", "coins"));
    const items: CustomCoin[] = snap.exists() ? ((snap.data()?.items as CustomCoin[]) ?? []) : [];
    if (items.find((c) => c.id === coin.id)) throw new Error("Coin already listed");
    await setDoc(doc(db, "admin_config", "coins"), { items: [...items, coin] });
  }

  async function removeCustomCoin(id: string) {
    const db = getFirebaseDb();
    const snap = await getDoc(doc(db, "admin_config", "coins"));
    const items: CustomCoin[] = snap.exists() ? ((snap.data()?.items as CustomCoin[]) ?? []) : [];
    await setDoc(doc(db, "admin_config", "coins"), { items: items.filter((c) => c.id !== id) });
  }

  async function updateAppConfig(updates: Partial<AppConfig>) {
    const db = getFirebaseDb();
    const current = { ...DEFAULT_CONFIG, ...appConfig, ...updates };
    await setDoc(doc(db, "admin_config", "app"), current, { merge: true });
    setAppConfig(current);
  }

  async function registerUserActivity(
    uid: string, email: string, name: string,
    balance: number, tradeCount: number, totalPnl: number
  ) {
    try {
      const db = getFirebaseDb();
      const userRef = doc(db, "users", uid);
      const existing = await getDoc(userRef);
      const admin = isAdminEmail(email);
      const userRole: UserRole = admin ? "admin" : "user";

      if (existing.exists()) {
        const data = existing.data() as AdminUser;
        if (data.needsReset) return;
        await updateDoc(userRef, {
          email, name, balance, tradeCount, totalPnl,
          role: userRole, lastSeen: Date.now(),
        });
      } else {
        await setDoc(userRef, {
          uid, email, name, balance, tradeCount, totalPnl,
          blocked: false, role: userRole,
          createdAt: Date.now(), lastSeen: Date.now(),
          needsReset: false, fakeBalanceAdded: 0,
        });
      }
    } catch {}
  }

  return (
    <AdminContext.Provider value={{
      isAdmin, role, adminEmail, users, usersError, announcements, appConfig, customCoins, blockedUids, loading,
      refreshUsers, blockUser, unblockUser, addFakeBalance, resetUserFund,
      addAnnouncement, updateAnnouncement, deleteAnnouncement, updateAppConfig,
      addCustomCoin, removeCustomCoin,
      registerUserActivity, checkAndApplyAdminReset, checkAndApplyAdminFundAdd, getUserTrades,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be inside AdminProvider");
  return ctx;
}
