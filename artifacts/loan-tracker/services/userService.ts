import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { auth, secondaryAuth, db } from "./firebase";
import type { UserProfile } from "./authService";

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), where("role", "==", "user"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function getUserByPhone(phone: string): Promise<UserProfile | null> {
  const q = query(collection(db, "users"), where("phone", "==", phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function addUser(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<UserProfile> {
  // IMPORTANT: Use secondaryAuth so creating a new user does NOT sign out the currently
  // logged-in admin. Firebase automatically signs in the newly created user — using a
  // separate auth instance prevents that from affecting the primary session.
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = cred.user.uid;

  // Sign out from the secondary instance immediately — we only needed it for account creation.
  await firebaseSignOut(secondaryAuth).catch(() => {});

  const profile: UserProfile = {
    id: uid,
    name,
    email,
    phone: phone ?? "",
    role: "user",
  };
  await setDoc(doc(db, "users", uid), profile);
  return profile;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<UserProfile, "name" | "email" | "phone">>
): Promise<void> {
  await updateDoc(doc(db, "users", id), data);
}

export async function deleteUser(id: string): Promise<void> {
  await deleteDoc(doc(db, "users", id));
}
