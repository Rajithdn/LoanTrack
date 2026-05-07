import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "./firebase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
}

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@07";

const googleProvider = new GoogleAuthProvider();

export function parseFirebaseError(e: any): string {
  const code: string = e?.code ?? "";
  if (code.includes("operation-not-allowed"))
    return "This sign-in method is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.";
  if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Invalid email or password.";
  if (code.includes("email-already-in-use"))
    return "This email is already registered. Please sign in instead.";
  if (code.includes("network-request-failed"))
    return "Network error. Check your internet connection.";
  if (code.includes("too-many-requests"))
    return "Too many failed attempts. Please try again later.";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request"))
    return "Sign-in was cancelled. Please try again.";
  if (code.includes("popup-blocked"))
    return "Pop-up was blocked by your browser. Please allow pop-ups for this site.";
  if (code === "permission-denied" || e?.message?.includes("permission-denied"))
    return "Database access denied. Please update your Firestore security rules to allow authenticated access.";
  if (e?.message) return e.message;
  return "An unexpected error occurred. Please try again.";
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return signInOrCreateAdmin();
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let profile = await getUserProfile(cred.user.uid);
    if (!profile) {
      profile = { id: cred.user.uid, name: email.split("@")[0], email, role: "user" };
      await setDoc(doc(db, "users", cred.user.uid), profile);
    }
    return profile;
  } catch (e: any) {
    throw new Error(parseFirebaseError(e));
  }
}

async function signInOrCreateAdmin(): Promise<UserProfile> {
  let uid: string;
  try {
    const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    uid = cred.user.uid;
  } catch (signInErr: any) {
    const code: string = signInErr?.code ?? "";
    // Firebase v12 uses "auth/invalid-credential" for both wrong-password AND user-not-found.
    // Try to create the admin account; if it already exists, the password in Firebase Console
    // differs from our default — surface a clear error.
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      try {
        const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        uid = cred.user.uid;
      } catch (createErr: any) {
        if (createErr?.code === "auth/email-already-in-use") {
          // Account exists but password doesn't match — admin may have changed it in console
          throw new Error(
            "Admin account exists but the password doesn't match. " +
            "Please reset it in the Firebase Console under Authentication → Users."
          );
        }
        throw new Error(parseFirebaseError(createErr));
      }
    } else {
      throw new Error(parseFirebaseError(signInErr));
    }
  }
  let profile = await getUserProfile(uid);
  if (!profile) {
    profile = { id: uid, name: "Administrator", email: ADMIN_EMAIL, role: "admin" };
    await setDoc(doc(db, "users", uid), profile);
  }
  return profile;
}

export async function buildGoogleProfile(firebaseUser: any): Promise<UserProfile> {
  let profile = await getUserProfile(firebaseUser.uid);
  if (!profile) {
    profile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "User",
      email: firebaseUser.email ?? "",
      phone: firebaseUser.phoneNumber ?? "",
      role: "user",
    };
    await setDoc(doc(db, "users", firebaseUser.uid), profile);
  }
  return profile;
}

export async function checkGoogleRedirectResult(): Promise<UserProfile | null> {
  if (Platform.OS !== "web") return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return await buildGoogleProfile(result.user);
  } catch {
    return null;
  }
}

// ── Web: popup → redirect fallback ───────────────────────────────────────────
export async function signInWithGoogle(): Promise<UserProfile> {
  if (Platform.OS !== "web") {
    throw new Error("__NATIVE_UNSUPPORTED__");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await buildGoogleProfile(result.user);
  } catch (e: any) {
    const code: string = e?.code ?? "";
    if (
      code.includes("popup-blocked") ||
      code.includes("operation-not-supported-in-this-environment") ||
      code.includes("web-storage-unsupported") ||
      code.includes("internal-error")
    ) {
      await signInWithRedirect(auth, googleProvider);
      return new Promise(() => {});
    }
    throw new Error(parseFirebaseError(e));
  }
}

// ── Native: called after expo-auth-session returns an id_token ───────────────
export async function signInWithGoogleIdToken(idToken: string): Promise<UserProfile> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return await buildGoogleProfile(result.user);
  } catch (e: any) {
    throw new Error(parseFirebaseError(e));
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<UserProfile> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile: UserProfile = {
      id: cred.user.uid,
      name,
      email,
      phone: phone ?? "",
      role: "user",
    };
    await setDoc(doc(db, "users", cred.user.uid), profile);
    return profile;
  } catch (e: any) {
    throw new Error(parseFirebaseError(e));
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e: any) {
    throw new Error(parseFirebaseError(e));
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch {
    return null;
  }
}
