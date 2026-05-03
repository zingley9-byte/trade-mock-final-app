import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export const ADMIN_EMAIL = "Zingley9@gmail.com";

export type UserRole = "admin" | "user";

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
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  createdAt: number;
  active: boolean;
}

const ADMIN_USERS_KEY         = "admin_users_v1";
const ADMIN_ANNOUNCEMENTS_KEY = "admin_announcements_v1";
const ADMIN_BLOCKED_KEY       = "admin_blocked_v1";
const ADMIN_FAKE_BALANCES_KEY = "admin_fake_balances_v1";

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
  fakeBalances: Record<string, number>;
  loading: boolean;
  refreshUsers: () => Promise<void>;
  blockUser: (uid: string) => Promise<void>;
  unblockUser: (uid: string) => Promise<void>;
  addFakeBalance: (uid: string, amount: number) => Promise<void>;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  registerUserActivity: (
    uid: string, email: string, name: string,
    balance: number, tradeCount: number, totalPnl: number
  ) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin]         = useState(false);
  const [role, setRole]               = useState<UserRole | null>(null);
  const [adminEmail, setAdminEmail]   = useState<string | null>(null);
  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const [fakeBalances, setFakeBalances] = useState<Record<string, number>>({});
  const [loading, setLoading]         = useState(true);

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
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRaw, announcementsRaw, blockedRaw, fakeRaw] = await Promise.all([
        AsyncStorage.getItem(ADMIN_USERS_KEY),
        AsyncStorage.getItem(ADMIN_ANNOUNCEMENTS_KEY),
        AsyncStorage.getItem(ADMIN_BLOCKED_KEY),
        AsyncStorage.getItem(ADMIN_FAKE_BALANCES_KEY),
      ]);
      if (usersRaw)         setUsers(JSON.parse(usersRaw));
      if (announcementsRaw) setAnnouncements(JSON.parse(announcementsRaw));
      if (blockedRaw)       setBlockedUids(JSON.parse(blockedRaw));
      if (fakeRaw)          setFakeBalances(JSON.parse(fakeRaw));
    } catch {}
  }

  async function refreshUsers() {
    const raw = await AsyncStorage.getItem(ADMIN_USERS_KEY);
    if (raw) setUsers(JSON.parse(raw));
  }

  async function blockUser(uid: string) {
    const userToBlock = users.find((u) => u.uid === uid);
    if (userToBlock && isAdminEmail(userToBlock.email)) return;
    const next = [...blockedUids.filter((u) => u !== uid), uid];
    setBlockedUids(next);
    await AsyncStorage.setItem(ADMIN_BLOCKED_KEY, JSON.stringify(next));
  }

  async function unblockUser(uid: string) {
    const next = blockedUids.filter((u) => u !== uid);
    setBlockedUids(next);
    await AsyncStorage.setItem(ADMIN_BLOCKED_KEY, JSON.stringify(next));
  }

  async function addFakeBalance(uid: string, amount: number) {
    const next = { ...fakeBalances, [uid]: (fakeBalances[uid] ?? 0) + amount };
    setFakeBalances(next);
    await AsyncStorage.setItem(ADMIN_FAKE_BALANCES_KEY, JSON.stringify(next));
  }

  async function addAnnouncement(a: Omit<Announcement, "id" | "createdAt">) {
    const item: Announcement = { ...a, id: Date.now().toString(), createdAt: Date.now() };
    const next = [item, ...announcements];
    setAnnouncements(next);
    await AsyncStorage.setItem(ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify(next));
  }

  async function updateAnnouncement(id: string, updates: Partial<Announcement>) {
    const next = announcements.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setAnnouncements(next);
    await AsyncStorage.setItem(ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify(next));
  }

  async function deleteAnnouncement(id: string) {
    const next = announcements.filter((a) => a.id !== id);
    setAnnouncements(next);
    await AsyncStorage.setItem(ADMIN_ANNOUNCEMENTS_KEY, JSON.stringify(next));
  }

  async function registerUserActivity(
    uid: string, email: string, name: string,
    balance: number, tradeCount: number, totalPnl: number
  ) {
    const raw = await AsyncStorage.getItem(ADMIN_USERS_KEY);
    const existing: AdminUser[] = raw ? JSON.parse(raw) : [];
    const idx     = existing.findIndex((u) => u.uid === uid);
    const admin   = isAdminEmail(email);
    const blocked = admin ? false : blockedUids.includes(uid);
    const userRole: UserRole = admin ? "admin" : "user";

    if (idx >= 0) {
      existing[idx] = {
        ...existing[idx],
        email, name, balance, tradeCount, totalPnl,
        blocked, role: userRole,
      };
    } else {
      existing.push({
        uid, email, name, balance, blocked,
        createdAt: Date.now(), tradeCount, totalPnl, role: userRole,
      });
    }
    setUsers(existing);
    await AsyncStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(existing));
  }

  return (
    <AdminContext.Provider value={{
      isAdmin, role, adminEmail, users, announcements, blockedUids, fakeBalances, loading,
      refreshUsers, blockUser, unblockUser, addFakeBalance,
      addAnnouncement, updateAnnouncement, deleteAnnouncement, registerUserActivity,
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
