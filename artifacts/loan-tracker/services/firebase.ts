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

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ── Primary app ───────────────────────────────────────────────────────────────
let app = getApps().find((a) => a.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);

// ── Secondary app (used only for creating new users without signing out the admin) ──
let secondaryApp = getApps().find((a) => a.name === "secondary") ?? initializeApp(firebaseConfig, "secondary");

// Resolve native persistence: firebase@12 removed getReactNativePersistence from public types
// but it is still available at runtime. We require() it to bypass type checks.
function getNativePersistence(): Persistence {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
