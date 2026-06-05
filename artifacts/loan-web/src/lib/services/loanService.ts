import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { Loan } from "../../types";

export const calculateEMI = (principal: number, annualRate: number, months: number): number => {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

export const createLoan = async (loanData: Omit<Loan, "id" | "emi" | "totalAmount" | "interestAmount" | "paidAmount" | "pendingAmount" | "status" | "startDate">): Promise<Loan> => {
  const emi = calculateEMI(loanData.amount, loanData.interest, loanData.duration);
  const totalAmount = emi * loanData.duration;
  const interestAmount = totalAmount - loanData.amount;
  
  const newLoan = {
    ...loanData,
    emi,
    totalAmount,
    interestAmount,
    paidAmount: 0,
    pendingAmount: totalAmount,
    status: "active" as const,
    startDate: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "loans"), newLoan);
  return { id: docRef.id, ...newLoan };
};

export const getLoans = async (): Promise<Loan[]> => {
  const snapshot = await getDocs(collection(db, "loans"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getUserLoans = async (userId: string): Promise<Loan[]> => {
  const q = query(collection(db, "loans"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getLoanById = async (loanId: string): Promise<Loan | null> => {
  const docRef = doc(db, "loans", loanId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Loan;
  }
  return null;
};
