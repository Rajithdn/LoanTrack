import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { UserProfile } from "./authService";
import type { Loan } from "./loanService";
import type { Payment } from "./paymentService";

function toCSV(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function exportLoansCSV(loans: Loan[], users: UserProfile[], payments: Payment[]): Promise<void> {
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const rows: string[][] = [
    ["Borrower", "Amount", "Interest %", "Duration (months)", "EMI", "Total Amount", "Paid Amount", "Pending Amount", "Status"],
  ];
  for (const loan of loans) {
    rows.push([
      loan.userName ?? userMap.get(loan.userId) ?? loan.userId,
      String(loan.amount),
      String(loan.interest),
      String(loan.duration),
      String(loan.emi),
      String(loan.totalAmount),
      String(loan.paidAmount),
      String(loan.pendingAmount),
      loan.status,
    ]);
  }
  const csv = toCSV(rows);

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loans_report.csv";
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const path = FileSystem.documentDirectory + "loans_report.csv";
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: "text/csv", dialogTitle: "Export Loan Report" });
}
