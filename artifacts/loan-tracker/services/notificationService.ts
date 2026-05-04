import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "payment" | "info" | "alert";
}

export async function sendNotification(
  userId: string,
  message: string,
  type: AppNotification["type"] = "payment"
): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId,
    message,
    timestamp: new Date().toISOString(),
    read: false,
    type,
  });
}

export async function getNotificationsForUser(userId: string): Promise<AppNotification[]> {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AppNotification))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
  } catch {}
}
