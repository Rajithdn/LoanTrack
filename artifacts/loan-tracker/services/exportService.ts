import * as _FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { UserProfile } from "./authService";
import type { Loan } from "./loanService";
import type { Payment } from "./paymentService";

// Cast to any: expo-file-system v19 restructured types but the runtime API still works.
// StorageAccessFramework, cacheDirectory, documentDirectory, writeAsStringAsync are all valid at runtime.
const FileSystem = _FileSystem as any;

// Use string literal — FileSystem.EncodingType is undefined in Expo Go
const UTF8 = "utf8";
const BOM = "\uFEFF";

function toCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ── Web download helpers ──────────────────────────────────────────────────────

function triggerAnchorDownload(a: HTMLAnchorElement): void {
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
  }, 200);
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
    triggerAnchorDownload(a);
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 3000);
    return;
  } catch {}

  try {
    const encoded = encodeURIComponent(content);
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encoded}`;
    a.download = fileName;
    a.style.cssText = "display:none;position:fixed;top:-9999px;left:-9999px;";
    triggerAnchorDownload(a);
    return;
  } catch {}

  try {
    const encoded = encodeURIComponent(content);
    const tab = window.open(`data:text/csv;charset=utf-8,${encoded}`, "_blank");
    if (!tab) {
      const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  } catch {}
}

// ── Android: save directly to Downloads via Storage Access Framework ──────────

async function saveToAndroidDownloads(csv: string, fileName: string): Promise<boolean> {
  // StorageAccessFramework is only available on Android native builds
  if (!FileSystem.StorageAccessFramework?.requestDirectoryPermissionsAsync) return false;

  try {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return false;

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      "text/csv"
    );
    await FileSystem.writeAsStringAsync(fileUri, BOM + csv, { encoding: UTF8 });
    return true;
  } catch {
    return false;
  }
}

// ── Build CSV rows ────────────────────────────────────────────────────────────

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

// ── Main export function ──────────────────────────────────────────────────────

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

  // ── Web ───────────────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    downloadBlobWeb(csv, fileName);
    return { savedDirectly: true };
  }

  // ── Android APK: try direct-save to Downloads via Storage Access Framework ─
  if (Platform.OS === "android") {
    const saved = await saveToAndroidDownloads(csv, fileName);
    if (saved) return { savedDirectly: true };
    // User cancelled the directory picker — fall through to share sheet
  }

  // ── iOS + Android fallback: write to cache then open share sheet ───────────
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
  if (!dir) throw new Error("Cannot access device storage.");

  const path = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(path, BOM + csv, { encoding: UTF8 });

  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(path, {
        mimeType: "text/csv",
        dialogTitle: "Save CSV Report",
        UTI: "public.comma-separated-values-text",
      });
    }
  } catch {
    // File is already written to cache — not fatal
  }

  return { savedDirectly: false };
}
