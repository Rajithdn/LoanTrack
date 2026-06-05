import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { Notification } from "../../types";

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  const ref = doc(db, "notifications", notificationId);
  await updateDoc(ref, { read: true });
};

export const createNotification = async (
  userId: string, 
  message: string, 
  type: "payment" | "alert" | "info"
): Promise<void> => {
  await addDoc(collection(db, "notifications"), {
    userId,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
};
