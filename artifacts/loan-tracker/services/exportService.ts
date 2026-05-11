import { Platform, Share } from "react-native";
import type { UserProfile } from "./authService";
import type { Loan } from "./loanService";
import type { Payment } from "./paymentService";

const BOM = "\uFEFF";

function toCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function buildCSV(loans: Loan[], users: UserProfile[], payments: Payment[]): string {
  const userMap = new Map(users.map((u) => [u.id, u]));

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

  const borrowerRows: string[][] = [
    ["--- BORROWERS ---"],
    ["Name", "Email", "Phone", "Active Loans", "Completed Loans", "Total Borrowed", "Total Paid", "Total Pending"],
  ];
  for (const u of users) {
    const ul = loans.filter((l) => l.userId === u.id);
    borrowerRows.push([
      u.name, u.email, u.phone ? `+91 ${u.phone}` : "",
      String(ul.filter((l) => l.status === "active").length),
      String(ul.filter((l) => l.status === "completed").length),
      String(ul.reduce((s, l) => s + l.amount, 0)),
      String(ul.reduce((s, l) => s + l.paidAmount, 0)),
      String(ul.reduce((s, l) => s + l.pendingAmount, 0)),
    ]);
  }
  borrowerRows.push([]);

  const loanRows: string[][] = [
    ["--- LOANS ---"],
    ["Borrower", "Email", "Phone", "Amount (₹)", "Interest (%)", "Duration (months)", "EMI (₹)", "Total Payable (₹)", "Interest Amount (₹)", "Paid (₹)", "Pending (₹)", "Status", "Start Date"],
  ];
  for (const loan of loans) {
    const u = userMap.get(loan.userId);
    loanRows.push([
      loan.userName ?? u?.name ?? loan.userId,
      u?.email ?? "", u?.phone ? `+91 ${u.phone}` : "",
      String(loan.amount), String(loan.interest), String(loan.duration),
      String(loan.emi), String(loan.totalAmount), String(loan.interestAmount ?? 0),
      String(loan.paidAmount), String(loan.pendingAmount), loan.status,
      loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "",
    ]);
  }
  loanRows.push([]);

  const paymentRows: string[][] = [
    ["--- PAYMENTS ---"],
    ["Borrower", "Email", "Amount (₹)", "Payment Mode", "Status", "Date", "Transaction Note"],
  ];
  for (const p of payments) {
    const u = userMap.get(p.userId);
    paymentRows.push([
      u?.name ?? p.userId, u?.email ?? "", String(p.amount),
      p.paymentMode ?? "", p.status,
      p.date ? new Date(p.date).toLocaleDateString("en-IN") : "",
      p.note ?? "",
    ]);
  }

  return toCSV([...summaryRows, ...borrowerRows, ...loanRows, ...paymentRows]);
}

function downloadBlobWeb(csv: string, fileName: string): void {
  const content = BOM + csv;
  try {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.style.cssText = "display:none;position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch {} }, 3000);
    return;
  } catch {}
  try {
    const encoded = encodeURIComponent(content);
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encoded}`;
    a.download = fileName;
    a.style.cssText = "display:none;position:fixed;top:-9999px;left:-9999px;";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 200);
  } catch {}
}

async function tryFileSystemExport(csv: string, fileName: string): Promise<boolean> {
  try {
    const FileSystem = require("expo-file-system");
    const Sharing = require("expo-sharing");

    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!dir) return false;

    const path = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(path, BOM + csv, { encoding: "utf8" });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(path, {
        mimeType: "text/csv",
        dialogTitle: "Save CSV Report",
        UTI: "public.comma-separated-values-text",
      });
      return true;
    }
  } catch {}
  return false;
}

export async function exportLoansCSV(
  loans: Loan[],
  users: UserProfile[],
  payments: Payment[]
): Promise<{ savedDirectly: boolean }> {
  if (!loans.length && !users.length && !payments.length) {
    throw new Error("No data to export.");
  }

  const csv = buildCSV(loans, users, payments);
  const fileName = `LoanTracker_Report_${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === "web") {
    downloadBlobWeb(csv, fileName);
    return { savedDirectly: true };
  }

  const fileOk = await tryFileSystemExport(csv, fileName);
  if (fileOk) return { savedDirectly: false };

  await Share.share(
    {
      title: fileName,
      message: csv,
    },
    { dialogTitle: "Save or Share CSV Report" }
  );

  return { savedDirectly: false };
}
