import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  getAuth,
  type Persistence,
} from "firebase/auth";
import { Platform } from "react-native";
import { getFirestore } from "firebase/firestore";

// Firebase web SDK keys are public client-side identifiers — safe to embed directly.
// process.env values are used in dev (Replit); hardcoded values are fallbacks for APK builds
// where Replit env vars are not injected automatically.
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? "AIzaSyDK6PP3uRu6zB6DNPIe4vhM2zS0cd__D1c",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "loantrackerapp-49abf.firebaseapp.com",
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL       ?? "https://loantrackerapp-49abf-default-rtdb.firebaseio.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? "loantrackerapp-49abf",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "loantrackerapp-49abf.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "341766430854",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? "1:341766430854:web:ced3dc2456c03b73297107",
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID     ?? "G-EKX8YE2B6G",
};

// ── Primary app ───────────────────────────────────────────────────────────────
const app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);

// ── Secondary app (used only for creating new users without signing out the admin) ──
const secondaryApp = getApps().find((a) => a.name === "secondary") ?? initializeApp(firebaseConfig, "secondary");

// Resolve native persistence: firebase@12 removed getReactNativePersistence from public types
// but it is still available at runtime. We require() it to bypass type checks.
function getNativePersistence(): Persistence {
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence: (storage: unknown) => Persistence;
    };
    return getReactNativePersistence(AsyncStorage);
  } catch {
    return inMemoryPersistence;
  }
}

// ── Primary auth ──────────────────────────────────────────────────────────────
let auth: ReturnType<typeof getAuth>;
try {
  if (Platform.OS === "web") {
    auth = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getNativePersistence(),
    });
  }
} catch {
  auth = getAuth(app);
}

// ── Secondary auth (inMemory only — used to create users without affecting admin session) ──
let secondaryAuth: ReturnType<typeof getAuth>;
try {
  secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
} catch {
  secondaryAuth = getAuth(secondaryApp);
}

export { auth, secondaryAuth };
export const db = getFirestore(app);
export default app;
