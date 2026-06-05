import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { Payment, Loan } from "../../types";
import { createNotification } from "./notificationService";

export const submitPayment = async (
  paymentData: Omit<Payment, "id" | "status" | "date">
): Promise<Payment> => {
  const newPayment = {
    ...paymentData,
    status: "pending" as const,
    date: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, "payments"), newPayment);
  
  // Notify admin
  await createNotification("admin", `New payment of ${paymentData.amount} submitted.`, "payment");
  
  return { id: docRef.id, ...newPayment };
};

export const getPendingPayments = async (): Promise<Payment[]> => {
  const q = query(collection(db, "payments"), where("status", "==", "pending"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
};

export const getUserPayments = async (userId: string): Promise<Payment[]> => {
  const q = query(collection(db, "payments"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getLoanPayments = async (loanId: string): Promise<Payment[]> => {
  const q = query(collection(db, "payments"), where("loanId", "==", loanId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const confirmPayment = async (
  paymentId: string, 
  adminId: string,
  updates?: { paymentMode?: string; note?: string }
): Promise<void> => {
  const paymentRef = doc(db, "payments", paymentId);
  const paymentSnap = await getDoc(paymentRef);
  
  if (!paymentSnap.exists()) throw new Error("Payment not found");
  
  const payment = paymentSnap.data() as Payment;
  if (payment.status !== "pending") throw new Error("Payment already processed");

  // Update payment
  await updateDoc(paymentRef, {
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
    updatedBy: adminId,
    ...updates
  });

  // Update loan
  const loanRef = doc(db, "loans", payment.loanId);
  const loanSnap = await getDoc(loanRef);
  if (loanSnap.exists()) {
    const loan = loanSnap.data() as Loan;
    const newPaidAmount = loan.paidAmount + payment.amount;
    const newPendingAmount = loan.totalAmount - newPaidAmount;
    
    await updateDoc(loanRef, {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      status: newPendingAmount <= 0 ? "completed" : "active"
    });
  }

  // Notify user
  await createNotification(
    payment.userId, 
    `Your payment of ${payment.amount} has been confirmed.`, 
    "payment"
  );
};

export const rejectPayment = async (
  paymentId: string,
  adminId: string,
  note?: string
): Promise<void> => {
  const paymentRef = doc(db, "payments", paymentId);
  const paymentSnap = await getDoc(paymentRef);
  
  if (!paymentSnap.exists()) throw new Error("Payment not found");
  const payment = paymentSnap.data() as Payment;

  await updateDoc(paymentRef, {
    status: "rejected",
    confirmedAt: new Date().toISOString(),
    updatedBy: adminId,
    note: note || "Payment rejected by admin"
  });

  // Notify user
  await createNotification(
    payment.userId, 
    `Your payment of ${payment.amount} was rejected.`, 
    "alert"
  );
};
