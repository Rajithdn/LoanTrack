import { initializeApp, getApps } from "firebase/app";
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

let app = getApps()[0];
if (!app) {
  app = initializeApp(firebaseConfig);
}

// Resolve native persistence: firebase@12 removed getReactNativePersistence from public types
// but it is still available at runtime. We require() it to bypass type checks.
// Falls back to inMemoryPersistence if unavailable.
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

// Use platform-appropriate persistence:
// - Web: browser storage (local → session → memory fallback chain)
// - Native (iOS/Android): AsyncStorage so auth survives app restarts
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
  // initializeAuth throws if auth was already initialized (e.g. hot reload)
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
