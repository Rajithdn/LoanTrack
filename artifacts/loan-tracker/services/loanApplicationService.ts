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
  return { id: ref.id, ...app };
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
  status: "approved" | "rejected",
  reviewNote?: string
): Promise<void> {
  await updateDoc(doc(db, "loanApplications", applicationId), {
    status,
    reviewNote: reviewNote ?? "",
    reviewedAt: new Date().toISOString(),
  });
}
