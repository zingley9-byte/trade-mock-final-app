import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDoc, increment, getDocs,
} from "firebase/firestore";

export const ADMIN_EMAIL = "Zingley9@gmail.com";

export type UserRole = "admin" | "user";

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
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin]         = useState(false);
  const [role, setRole]               = useState<UserRole | null>(null);
  const [adminEmail, setAdminEmail]   = useState<string | null>(null);
  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [appConfig, setAppConfig]     = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]         = useState(true);

  const usersUnsubRef = useRef<(() => void) | null>(null);
  const announcementsUnsubRef = useRef<(() => void) | null>(null);
  const configUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      const email = user?.email ?? null;
      const admin = isAdminEmail(email);
      setAdminEmail(email);
      setIsAdmin(admin);
      setRole(email ? (admin ? "admin" : "user") : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();

    usersUnsubRef.current?.();
    usersUnsubRef.current = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: AdminUser[] = [];
        snap.forEach((d) => list.push(d.data() as AdminUser));
        setUsers(list);
      },
      () => {}
    );

    announcementsUnsubRef.current?.();
    announcementsUnsubRef.current = onSnapshot(
      query(collection(db, "announcements"), orderBy("createdAt", "desc")),
      (snap) => {
        const list: Announcement[] = [];
        snap.forEach((d) => list.push(d.data() as Announcement));
        setAnnouncements(list);
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

    return () => {
      usersUnsubRef.current?.();
      announcementsUnsubRef.current?.();
      configUnsubRef.current?.();
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
      balance: 1000000,
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

  async function addAnnouncement(a: Omit<Announcement, "id" | "createdAt">) {
    const db = getFirebaseDb();
    const id = Date.now().toString();
    const item: Announcement = { ...a, id, createdAt: Date.now() };
    await setDoc(doc(db, "announcements", id), item);
  }

  async function updateAnnouncement(id: string, updates: Partial<Announcement>) {
    const db = getFirebaseDb();
    await updateDoc(doc(db, "announcements", id), updates as Record<string, unknown>);
  }

  async function deleteAnnouncement(id: string) {
    const db = getFirebaseDb();
    await deleteDoc(doc(db, "announcements", id));
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
      isAdmin, role, adminEmail, users, announcements, appConfig, blockedUids, loading,
      refreshUsers, blockUser, unblockUser, addFakeBalance, resetUserFund,
      addAnnouncement, updateAnnouncement, deleteAnnouncement, updateAppConfig,
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
