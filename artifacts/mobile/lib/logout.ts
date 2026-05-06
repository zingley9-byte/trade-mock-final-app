import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseAuth } from "./firebase";

const LOGOUT_KEYS = [
  "tm_auth_user",
  "trademock_profile_image",
  "tm_profile",
  "trademock_state_v4",
];

export async function performLogout(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
  await AsyncStorage.multiRemove(LOGOUT_KEYS);
}
