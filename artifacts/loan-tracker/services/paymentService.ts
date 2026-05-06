import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateLoanPaid, type Loan } from "./loanService";
import { sendNotification } from "./notificationService";
import { getPushToken, getAdminPushTokens, sendPushNotification } from "./pushNotificationService";

export type PaymentMode = "PhonePe" | "Google Pay" | "Cash" | "Bank Transfer";

export interface Payment {
  id: string;
  loanId: string;
  userId: string;
  date: string;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  paymentMode?: PaymentMode;
  note?: string;
  updatedBy?: string;
  confirmedAt?: string;
}

export async function getAllPayments(): Promise<Payment[]> {
  const snap = await getDocs(collection(db, "payments"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPaymentsByUser(userId: string): Promise<Payment[]> {
  const q = query(collection(db, "payments"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const q = query(collection(db, "payments"), where("loanId", "==", loanId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Payment))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function submitPayment(
  loanId: string,
  userId: string,
  amount: number,
  paymentMode?: PaymentMode
): Promise<Payment> {
  const payment: Omit<Payment, "id"> = {
    loanId,
    userId,
    date: new Date().toISOString(),
    amount,
    status: "pending",
    paymentMode,
  };
  const ref = await addDoc(collection(db, "payments"), payment);

  // Notify admin via push (best-effort)
  getAdminPushTokens().then((tokens) =>
    sendPushNotification(tokens, {
      title: "New Payment Submitted",
      body: `A borrower submitted ₹${amount.toLocaleString()} via ${paymentMode ?? "Cash"}. Tap to review.`,
      data: { screen: "payments" },
    })
  ).catch(() => {});

  return { id: ref.id, ...payment };
}

export async function confirmPayment(
  payment: Payment,
  loan: Loan,
  paymentMode: PaymentMode,
  note: string,
  adminName: string
): Promise<void> {
  await updateDoc(doc(db, "payments", payment.id), {
    status: "confirmed",
    paymentMode,
    note,
    updatedBy: adminName,
    confirmedAt: new Date().toISOString(),
  });
  await updateLoanPaid(payment.loanId, payment.amount, loan);

  const msg = `Your payment of ₹${payment.amount.toLocaleString()} via ${paymentMode} has been confirmed. ✓`;

  // In-app notification (Firestore)
  await sendNotification(payment.userId, msg, "payment").catch(() => {});

  // Push notification (best-effort)
  getPushToken(payment.userId).then((token) => {
    if (token) sendPushNotification(token, {
      title: "Payment Confirmed ✓",
      body: `₹${payment.amount.toLocaleString()} via ${paymentMode} confirmed by admin.`,
      data: { screen: "dashboard" },
    });
  }).catch(() => {});
}

export async function rejectPayment(paymentId: string, userId: string, amount: number): Promise<void> {
  await updateDoc(doc(db, "payments", paymentId), { status: "rejected" });

  const msg = `Your payment of ₹${amount.toLocaleString()} was not confirmed. Please contact admin.`;

  // In-app notification (Firestore)
  await sendNotification(userId, msg, "alert").catch(() => {});

  // Push notification (best-effort)
  getPushToken(userId).then((token) => {
    if (token) sendPushNotification(token, {
      title: "Payment Not Confirmed",
      body: `₹${amount.toLocaleString()} payment was rejected. Please contact your admin.`,
      data: { screen: "dashboard" },
    });
  }).catch(() => {});
}
