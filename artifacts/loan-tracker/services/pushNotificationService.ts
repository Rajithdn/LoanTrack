import { Platform } from "react-native";
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ── Token registration (native only) ─────────────────────────────────────────
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const Notifications = await import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const Constants = (await import("expo-constants")).default;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    await setDoc(doc(db, "pushTokens", userId), {
      userId,
      token,
      platform: Platform.OS,
      updatedAt: new Date().toISOString(),
    });

    return token;
  } catch {
    return null;
  }
}

// ── Token lookup ──────────────────────────────────────────────────────────────
export async function getPushToken(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "pushTokens", userId));
    if (!snap.exists()) return null;
    return (snap.data() as any).token ?? null;
  } catch {
    return null;
  }
}

export async function getAdminPushTokens(): Promise<string[]> {
  try {
    const usersSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );
    const adminIds = usersSnap.docs.map((d) => d.id);
    const tokens: string[] = [];
    for (const id of adminIds) {
      const t = await getPushToken(id);
      if (t) tokens.push(t);
    }
    return tokens;
  } catch {
    return [];
  }
}

// ── Push delivery via Expo push API ──────────────────────────────────────────
export async function sendPushNotification(
  tokens: string | string[],
  { title, body, data }: PushMessage
): Promise<void> {
  const list = Array.isArray(tokens) ? tokens : [tokens];
  const valid = list.filter((t) => t.startsWith("ExponentPushToken["));
  if (!valid.length) return;

  const messages = valid.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: "default",
    priority: "high",
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  }).catch(() => {});
}
