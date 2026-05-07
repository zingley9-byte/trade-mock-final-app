import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getFirebaseAuth } from "./firebase";

export const LOGOUT_KEYS = [
  "tm_auth_user",
  "trademock_profile_image",
  "tm_profile",
  "trademock_state_v4",
];

/**
 * Clear Firebase auth tokens from web localStorage.
 * Firebase stores tokens under keys starting with "firebase:" and
 * "firebaseLocalStorage" on web — these must be wiped on logout or
 * the auth.tsx check of `fbAuth.currentUser` can return a stale user
 * before indexedDB is fully cleared.
 */
function clearWebStorage(): void {
  if (Platform.OS !== "web") return;
  try {
    if (typeof localStorage !== "undefined") {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("firebase:") ||
          key.startsWith("firebaseLocalStorage") ||
          LOGOUT_KEYS.includes(key)
        ) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  } catch {}
}

/**
 * Fully log out the current user across all platforms.
 *
 * Order matters:
 *  1. Remove AsyncStorage keys FIRST so auth.tsx's session-guard check
 *     immediately sees no session and does NOT redirect back to /(tabs).
 *  2. Clear web localStorage tokens so Firebase's synchronous
 *     `currentUser` is stale-free.
 *  3. Call Firebase signOut() last.
 */
export async function performLogout(): Promise<void> {
  // Step 1 — clear AsyncStorage before signOut to prevent auth.tsx race
  await AsyncStorage.multiRemove(LOGOUT_KEYS).catch(() => {});

  // Step 2 — clear web localStorage / sessionStorage
  clearWebStorage();

  // Step 3 — sign out from Firebase
  const auth = getFirebaseAuth();
  await signOut(auth);
}
