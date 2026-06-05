export interface Loan {
  id: string;
  userId: string;
  userName?: string;
  amount: number;        // principal
  interest: number;      // annual rate %
  duration: number;      // months
  emi: number;
  totalAmount: number;
  interestAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: "active" | "completed";
  startDate: string;     // ISO date
}

export interface Payment {
  id: string;
  loanId: string;
  userId: string;
  date: string;
  amount: number;
  status: "pending" | "confirmed" | "rejected";
  paymentMode?: "PhonePe" | "Google Pay" | "Cash" | "Bank Transfer" | string;
  note?: string;
  updatedBy?: string;
  confirmedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: "payment" | "alert" | "info";
  read: boolean;
  createdAt: string;
}
