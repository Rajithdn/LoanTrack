import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";
import { getUserProfile, checkGoogleRedirectResult, type UserProfile } from "@/services/authService";
import { registerForPushNotifications } from "@/services/pushNotificationService";

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: any | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingResolved = useRef(false);

  useEffect(() => {
    // Handle Google redirect result (comes back after signInWithRedirect flow)
    checkGoogleRedirectResult().then((profile) => {
      if (profile) setUser(profile);
    }).catch(() => {});

    // Safety timeout: if onAuthStateChanged never fires (e.g. Firebase blocked or iframe),
    // unblock the loading state after 4 seconds so the user can at least see the login screen.
    const timeout = setTimeout(() => {
      if (!loadingResolved.current) {
        loadingResolved.current = true;
        setLoading(false);
      }
    }, 4000);

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeout);
      loadingResolved.current = true;
      setFirebaseUser(fbUser);
      try {
        if (fbUser) {
          const profile = await getUserProfile(fbUser.uid);
          setUser(profile);
          // Register for push notifications after login (native only, best-effort)
          registerForPushNotifications(fbUser.uid).catch(() => {});
        } else {
          setUser(null);
        }
      } catch {
        // Ensure loading is always resolved even if Firestore is unreachable
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
