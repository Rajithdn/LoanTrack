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
import { updateLoanPaid, type Loan } from "./loanService";

export interface Payment {
  id: string;
  loanId: string;
  userId: string;
  date: string;
  amount: number;
  status: "pending" | "confirmed";
  note?: string;
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

export async function submitPayment(loanId: string, userId: string, amount: number): Promise<Payment> {
  const payment: Omit<Payment, "id"> = {
    loanId,
    userId,
    date: new Date().toISOString(),
    amount,
    status: "pending",
  };
  const ref = await addDoc(collection(db, "payments"), payment);
  return { id: ref.id, ...payment };
}

export async function confirmPayment(payment: Payment, loan: Loan): Promise<void> {
  await updateDoc(doc(db, "payments", payment.id), { status: "confirmed" });
  await updateLoanPaid(payment.loanId, payment.amount, loan);
}

export async function rejectPayment(paymentId: string): Promise<void> {
  await updateDoc(doc(db, "payments", paymentId), { status: "pending" });
}
