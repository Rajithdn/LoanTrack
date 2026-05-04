import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Loan {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  interest: number;
  duration: number;
  emi: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "active" | "completed";
  startDate: string;
}

export function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  const n = months;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi * 100) / 100;
}

export async function getAllLoans(): Promise<Loan[]> {
  const snap = await getDocs(collection(db, "loans"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Loan));
}

export async function getLoansByUser(userId: string): Promise<Loan[]> {
  const q = query(collection(db, "loans"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Loan));
}

export async function addLoan(
  userId: string,
  userName: string,
  amount: number,
  interest: number,
  duration: number
): Promise<Loan> {
  const emi = calculateEMI(amount, interest, duration);
  const totalAmount = Math.round(emi * duration * 100) / 100;
  const loan: Omit<Loan, "id"> = {
    userId,
    userName,
    amount,
    interest,
    duration,
    emi,
    totalAmount,
    paidAmount: 0,
    pendingAmount: totalAmount,
    status: "active",
    startDate: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "loans"), loan);
  return { id: ref.id, ...loan };
}

export async function updateLoanPaid(loanId: string, additionalAmount: number, currentLoan: Loan): Promise<void> {
  const newPaid = Math.round((currentLoan.paidAmount + additionalAmount) * 100) / 100;
  const newPending = Math.round((currentLoan.pendingAmount - additionalAmount) * 100) / 100;
  const status: Loan["status"] = newPending <= 0 ? "completed" : "active";
  await updateDoc(doc(db, "loans", loanId), {
    paidAmount: newPaid,
    pendingAmount: Math.max(0, newPending),
    status,
  });
}
