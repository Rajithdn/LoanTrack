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

  // Notify borrower
  const modeLabel = paymentMode;
  await sendNotification(
    payment.userId,
    `Your payment of ₹${payment.amount.toLocaleString()} via ${modeLabel} has been confirmed. ✓`,
    "payment"
  ).catch(() => {});
}

export async function rejectPayment(paymentId: string, userId: string, amount: number): Promise<void> {
  await updateDoc(doc(db, "payments", paymentId), { status: "rejected" });
  await sendNotification(
    userId,
    `Your payment of ₹${amount.toLocaleString()} was not confirmed. Please contact admin.`,
    "alert"
  ).catch(() => {});
}
