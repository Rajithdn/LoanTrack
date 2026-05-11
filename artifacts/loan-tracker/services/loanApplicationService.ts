import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { sendNotification } from "./notificationService";
import { sendPushNotification, getAdminPushTokens, getPushToken } from "./pushNotificationService";

export interface LoanApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  purpose: string;
  duration: number;
  message?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

async function getAdminUserIds(): Promise<string[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

export async function submitLoanApplication(
  userId: string,
  userName: string,
  userEmail: string,
  amount: number,
  purpose: string,
  duration: number,
  message?: string
): Promise<LoanApplication> {
  const app: Omit<LoanApplication, "id"> = {
    userId,
    userName,
    userEmail,
    amount,
    purpose,
    duration,
    message: message ?? "",
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "loanApplications"), app);
  const newApp = { id: ref.id, ...app };

  // Notify all admins — in-app + push
  try {
    const adminIds = await getAdminUserIds();
    const notifMsg = `New loan application from ${userName} — ₹${amount.toLocaleString("en-IN")} for ${purpose}.`;

    await Promise.all(
      adminIds.map((adminId) =>
        sendNotification(adminId, notifMsg, "info").catch(() => {})
      )
    );

    const adminTokens = await getAdminPushTokens();
    if (adminTokens.length > 0) {
      await sendPushNotification(adminTokens, {
        title: "📋 New Loan Application",
        body: `${userName} has applied for ₹${amount.toLocaleString("en-IN")} (${purpose}). Tap to review.`,
        data: { type: "new_application", screen: "/(admin)/loans" },
      }).catch(() => {});
    }
  } catch {}

  return newApp;
}

export async function getAllApplications(): Promise<LoanApplication[]> {
  const snap = await getDocs(
    query(collection(db, "loanApplications"), orderBy("submittedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoanApplication));
}

export async function getApplicationsByUser(userId: string): Promise<LoanApplication[]> {
  const snap = await getDocs(
    query(collection(db, "loanApplications"), where("userId", "==", userId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as LoanApplication))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function reviewApplication(
  applicationId: string,
  userId: string,
  userName: string,
  amount: number,
  status: "approved" | "rejected",
  reviewNote?: string
): Promise<void> {
  await updateDoc(doc(db, "loanApplications", applicationId), {
    status,
    reviewNote: reviewNote ?? "",
    reviewedAt: new Date().toISOString(),
  });

  // Send in-app notification to the user
  try {
    const isApproved = status === "approved";
    const noteStr = reviewNote ? ` Note: ${reviewNote}` : "";
    const inAppMsg = isApproved
      ? `Your loan application for ₹${amount.toLocaleString("en-IN")} has been approved!${noteStr}`
      : `Your loan application for ₹${amount.toLocaleString("en-IN")} was not approved.${noteStr}`;

    await sendNotification(userId, inAppMsg, isApproved ? "info" : "alert").catch(() => {});

    // Push notification to user's device
    const userToken = await getPushToken(userId).catch(() => null);
    if (userToken) {
      await sendPushNotification([userToken], {
        title: isApproved ? "✅ Loan Application Approved!" : "❌ Loan Application Update",
        body: isApproved
          ? `Your application for ₹${amount.toLocaleString("en-IN")} was approved. The admin will set up your loan.`
          : `Your application for ₹${amount.toLocaleString("en-IN")} was not approved.${noteStr}`,
        data: { type: "application_reviewed", status, screen: "/(user)/apply" },
      }).catch(() => {});
    }
  } catch {}
}
