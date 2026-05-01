import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.GOOGLE_API_KEY || "",
  authDomain: "trademock-webs.firebaseapp.com",
  projectId: "trademock-webs",
  storageBucket: "trademock-webs.firebasestorage.app",
  messagingSenderId: "942675467405",
  appId: "1:942675467405:web:1ee287776bc282c10456c4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
