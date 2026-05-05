import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

export function parseFirebaseError(e: any): string {
  const code: string = e?.code ?? "";
  if (code.includes("operation-not-allowed"))
    return "Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.";
  if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Invalid email or password.";
  if (code.includes("email-already-in-use"))
    return "This email is already registered. Please sign in instead.";
  if (code.includes("network-request-failed"))
    return "Network error. Check your internet connection.";
  if (code.includes("too-many-requests"))
    return "Too many failed attempts. Please try again later.";
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
  } catch (e: any) {
    if (e?.code === "auth/user-not-found" || e?.code === "auth/invalid-credential") {
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = cred.user.uid;
    } else {
      throw new Error(parseFirebaseError(e));
    }
  }
  let profile = await getUserProfile(uid);
  if (!profile) {
    profile = { id: uid, name: "Administrator", email: ADMIN_EMAIL, role: "admin" };
    await setDoc(doc(db, "users", uid), profile);
  }
  return profile;
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
