import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) throw new Error("User profile not found");
  return profile;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function register(name: string, email: string, password: string): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    id: cred.user.uid,
    name,
    email,
    role: "user",
  };
  await setDoc(doc(db, "users", cred.user.uid), profile);
  return profile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function seedAdmin(): Promise<void> {
  try {
    const adminEmail = "admin@gmail.com";
    const adminPassword = "Admin@07";
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      uid = cred.user.uid;
    } catch {
      const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      uid = cred.user.uid;
    }
    const existing = await getDoc(doc(db, "users", uid));
    if (!existing.exists()) {
      await setDoc(doc(db, "users", uid), {
        id: uid,
        name: "Administrator",
        email: adminEmail,
        role: "admin",
      } as UserProfile);
    }
    await firebaseSignOut(auth);
  } catch (e) {
    // Admin may already exist
  }
}
