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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";
import type { UserProfile } from "./authService";

export async function getAllUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), where("role", "==", "user"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
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
