import { Platform } from "react-native";
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ── EMI due-date reminder scheduling (native only) ──────────────────────────
export async function scheduleEMIReminders(loans: Array<{
  id: string;
  status: string;
  emi: number;
  startDate: string;
  paidAmount: number;
  duration: number;
}>): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const Notifications = await import("expo-notifications");

    // Cancel all previously scheduled EMI reminders before rescheduling
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const emiReminders = scheduled.filter(
      (n) => (n.content.data as any)?.type === "emi_reminder"
    );
    await Promise.all(
      emiReminders.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    const activeLoans = loans.filter((l) => l.status === "active");

    for (const loan of activeLoans) {
      const start = new Date(loan.startDate);
      const progress = loan.paidAmount / (loan.emi * loan.duration || 1);
      const paidMonths = Math.floor(progress * loan.duration);
      const nextDueDate = new Date(
        start.getFullYear(),
        start.getMonth() + paidMonths + 1,
        start.getDate()
      );

      // Remind 1 day before the due date at 9 AM
      const reminderDate = new Date(nextDueDate);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0);

      // Only schedule if the reminder is in the future
      if (reminderDate.getTime() > Date.now() + 60_000) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "EMI Due Tomorrow! 💰",
            body: `Your EMI of ₹${loan.emi.toLocaleString("en-IN")} is due tomorrow. Tap to submit payment.`,
            sound: true,
            data: { type: "emi_reminder", loanId: loan.id, screen: "dashboard" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
        }).catch(() => {});
      } else if (
        // Same-day reminder: due date is today or tomorrow, hasn't been reminded yet
        nextDueDate.toDateString() === new Date().toDateString()
      ) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "EMI Due Today! ⚠️",
            body: `Your EMI of ₹${loan.emi.toLocaleString("en-IN")} is due today. Please submit your payment.`,
            sound: true,
            data: { type: "emi_reminder", loanId: loan.id, screen: "dashboard" },
          },
          trigger: null, // fire immediately
        }).catch(() => {});
      }
    }
  } catch {}
}

// ── Token registration (native only) ─────────────────────────────────────────
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const Notifications = await import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
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

    // getExpoPushTokenAsync only works in a real build (development build or standalone)
    // It is intentionally unsupported in Expo Go since SDK 53 — skip gracefully
    let token: string;
    try {
      const Constants = (await import("expo-constants")).default;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        undefined;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData.data;
    } catch {
      // Running in Expo Go — remote push tokens not available; local scheduled
      // notifications (EMI reminders) still work fine
      return null;
    }

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

// ── Overdue loan alerts for admin ─────────────────────────────────────────────
export async function notifyAdminOfOverdueLoans(loans: Array<{
  id: string;
  status: string;
  emi: number;
  startDate: string;
  paidAmount: number;
  duration: number;
  userName?: string;
}>): Promise<void> {
  try {
    const now = new Date();
    const overdueLoans = loans.filter((l) => {
      if (l.status !== "active") return false;
      const start = new Date(l.startDate);
      const monthsElapsed = Math.floor(
        (now.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
      );
      if (monthsElapsed <= 0) return false;
      const expectedPaid = Math.min(monthsElapsed, l.duration) * l.emi;
      return l.paidAmount < expectedPaid - 1;
    });

    if (!overdueLoans.length) return;

    const adminTokens = await getAdminPushTokens();
    if (!adminTokens.length) return;

    // Group into one notification if many overdue, or individual if few
    if (overdueLoans.length === 1) {
      const loan = overdueLoans[0];
      await sendPushNotification(adminTokens, {
        title: "⚠️ Overdue EMI Alert",
        body: `${loan.userName ?? "A borrower"} has missed their EMI payment of ₹${loan.emi.toLocaleString("en-IN")}. Tap to review.`,
        data: { type: "overdue_alert", loanId: loan.id, screen: "/(admin)/loans" },
      });
    } else {
      await sendPushNotification(adminTokens, {
        title: `⚠️ ${overdueLoans.length} Overdue EMIs`,
        body: `${overdueLoans.length} borrowers have missed their EMI payments. Tap to review all loans.`,
        data: { type: "overdue_alert", screen: "/(admin)/loans" },
      });
    }
  } catch {}
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
