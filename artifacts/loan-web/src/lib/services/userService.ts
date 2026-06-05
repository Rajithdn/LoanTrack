import { db, secondaryAuth } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { UserProfile } from "../../types";

export const getUsers = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, "users"), where("role", "==", "user"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
};

export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", userId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as UserProfile;
  }
  return null;
};

export const createBorrower = async (data: Omit<UserProfile, "id" | "role"> & { password?: string }): Promise<UserProfile> => {
  // Use secondary app to create user without signing out the admin
  const userCredential = await createUserWithEmailAndPassword(
    secondaryAuth, 
    data.email, 
    data.password || "Password@123"
  );
  
  const userId = userCredential.user.uid;
  
  const userProfile: UserProfile = {
    id: userId,
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    role: "user"
  };

  await setDoc(doc(db, "users", userId), {
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    role: "user"
  });

  // Sign out secondary app
  await signOut(secondaryAuth);
  
  return userProfile;
};
