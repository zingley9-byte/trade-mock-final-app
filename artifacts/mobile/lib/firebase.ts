import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { Auth, initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_KEY: string =
  (Constants.expoConfig?.extra?.firebaseApiKey as string) ||
  (process.env.FIREBASE_API_KEY as string) ||
  "";

const firebaseConfig = {
  apiKey: API_KEY,
  authDomain: "trademock-webs.firebaseapp.com",
  projectId: "trademock-webs",
  storageBucket: "trademock-webs.firebasestorage.app",
  messagingSenderId: "942675467405",
  appId: "1:942675467405:web:1ee287776bc282c10456c4",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  const existing = getApps();
  _app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (Platform.OS === "web") {
    _auth = getAuth(app);
  } else {
    try {
      _auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      _auth = getAuth(app);
    }
  }
  return _auth;
}

export { firebaseConfig };
export default getFirebaseApp;
