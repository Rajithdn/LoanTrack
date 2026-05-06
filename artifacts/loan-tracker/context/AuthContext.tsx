import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase";
import { getUserProfile, checkGoogleRedirectResult, type UserProfile } from "@/services/authService";

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

    // Safety timeout: if onAuthStateChanged never fires (e.g. Firebase blocked),
    // unblock the loading state after 8 seconds so the user can at least see the login screen.
    const timeout = setTimeout(() => {
      if (!loadingResolved.current) {
        loadingResolved.current = true;
        setLoading(false);
      }
    }, 8000);

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeout);
      loadingResolved.current = true;
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
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
