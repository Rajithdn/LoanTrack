import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { UserProfile } from "./authService";
import type { Loan } from "./loanService";
import type { Payment } from "./paymentService";

function toCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function exportLoansCSV(loans: Loan[], users: UserProfile[], payments: Payment[]): Promise<void> {
  const userMap = new Map(users.map((u) => [u.id, u]));

  // ---- Section 1: Summary ----
  const summaryRows: string[][] = [
    ["=== LOAN TRACKER — FULL REPORT ==="],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["--- SUMMARY ---"],
    ["Total Borrowers", String(users.length)],
    ["Total Loans", String(loans.length)],
    ["Active Loans", String(loans.filter((l) => l.status === "active").length)],
    ["Completed Loans", String(loans.filter((l) => l.status === "completed").length)],
    ["Total Loan Amount", String(loans.reduce((s, l) => s + l.amount, 0))],
    ["Total Collected", String(loans.reduce((s, l) => s + l.paidAmount, 0))],
    ["Total Pending", String(loans.reduce((s, l) => s + l.pendingAmount, 0))],
    ["Total Interest Earned", String(loans.reduce((s, l) => s + (l.interestAmount ?? 0), 0))],
    ["Total Payments", String(payments.length)],
    ["Confirmed Payments", String(payments.filter((p) => p.status === "confirmed").length)],
    ["Pending Payments", String(payments.filter((p) => p.status === "pending").length)],
    [],
  ];

  // ---- Section 2: Borrowers ----
  const borrowerRows: string[][] = [
    ["--- BORROWERS ---"],
    ["Name", "Email", "Phone", "Active Loans", "Completed Loans", "Total Borrowed", "Total Paid", "Total Pending"],
  ];
  for (const u of users) {
    const userLoans = loans.filter((l) => l.userId === u.id);
    const activeCount = userLoans.filter((l) => l.status === "active").length;
    const completedCount = userLoans.filter((l) => l.status === "completed").length;
    const totalBorrowed = userLoans.reduce((s, l) => s + l.amount, 0);
    const totalPaid = userLoans.reduce((s, l) => s + l.paidAmount, 0);
    const totalPending = userLoans.reduce((s, l) => s + l.pendingAmount, 0);
    borrowerRows.push([
      u.name,
      u.email,
      u.phone ? `+91 ${u.phone}` : "",
      String(activeCount),
      String(completedCount),
      String(totalBorrowed),
      String(totalPaid),
      String(totalPending),
    ]);
  }
  borrowerRows.push([]);

  // ---- Section 3: Loans ----
  const loanRows: string[][] = [
    ["--- LOANS ---"],
    ["Borrower", "Email", "Phone", "Amount (₹)", "Interest (%)", "Duration (months)", "EMI (₹)", "Total Payable (₹)", "Interest Amount (₹)", "Paid (₹)", "Pending (₹)", "Status", "Start Date"],
  ];
  for (const loan of loans) {
    const u = userMap.get(loan.userId);
    loanRows.push([
      loan.userName ?? u?.name ?? loan.userId,
      u?.email ?? "",
      u?.phone ? `+91 ${u.phone}` : "",
      String(loan.amount),
      String(loan.interest),
      String(loan.duration),
      String(loan.emi),
      String(loan.totalAmount),
      String(loan.interestAmount ?? 0),
      String(loan.paidAmount),
      String(loan.pendingAmount),
      loan.status,
      loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "",
    ]);
  }
  loanRows.push([]);

  // ---- Section 4: Payments ----
  const paymentRows: string[][] = [
    ["--- PAYMENTS ---"],
    ["Borrower", "Email", "Amount (₹)", "Payment Mode", "Status", "Date", "Transaction Note"],
  ];
  for (const p of payments) {
    const u = userMap.get(p.userId);
    paymentRows.push([
      u?.name ?? p.userId,
      u?.email ?? "",
      String(p.amount),
      p.paymentMode ?? "",
      p.status,
      p.date ? new Date(p.date).toLocaleDateString("en-IN") : "",
      (p as any).txNote ?? "",
    ]);
  }

  const allRows = [...summaryRows, ...borrowerRows, ...loanRows, ...paymentRows];
  const csv = toCSV(allRows);

  if (Platform.OS === "web") {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LoanTracker_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const fileName = `LoanTracker_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  const path = (FileSystem.documentDirectory ?? "") + fileName;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Export Full Report" });
}
