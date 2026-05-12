import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { Payment } from "./paymentService";
import type { Loan } from "./loanService";
import type { UserProfile } from "./authService";

function fmt(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function buildEMISchedule(loan: Loan): { month: number; dueDate: string; emi: number; status: "paid" | "upcoming" }[] {
  const start = new Date(loan.startDate);
  const rows = [];
  const paidMonths = Math.round(loan.paidAmount / loan.emi);
  for (let i = 0; i < loan.duration; i++) {
    const due = new Date(start.getFullYear(), start.getMonth() + i + 1, start.getDate());
    rows.push({
      month: i + 1,
      dueDate: fmtDate(due.toISOString()),
      emi: loan.emi,
      status: i < paidMonths ? "paid" : "upcoming",
    } as const);
  }
  return rows;
}

function buildStatementHTML(loan: Loan, borrower: UserProfile, payments: Payment[]): string {
  const confirmed = payments.filter((p) => p.status === "confirmed").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const progress = Math.min(100, Math.round((loan.paidAmount / loan.totalAmount) * 100));
  const schedule = buildEMISchedule(loan);
  const statementNo = `ST-${loan.id.slice(-8).toUpperCase()}`;
  const generatedOn = new Date().toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const paymentRows = confirmed.length
    ? confirmed.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${fmtDate(p.date)}</td>
          <td class="amt green">${fmt(p.amount)}</td>
          <td>${p.paymentMode ?? "Cash"}</td>
          <td>${p.note ? p.note.slice(0, 30) : "—"}</td>
          <td>${p.updatedBy ?? "Admin"}</td>
        </tr>`).join("")
    : `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:20px">No confirmed payments yet</td></tr>`;

  const scheduleRows = schedule.map((r) => `
    <tr class="${r.status === "paid" ? "paid-row" : "upcoming-row"}">
      <td>${r.month}</td>
      <td>${r.dueDate}</td>
      <td class="amt">${fmt(r.emi)}</td>
      <td><span class="badge ${r.status === "paid" ? "badge-paid" : "badge-upcoming"}">${r.status === "paid" ? "✓ Paid" : "Upcoming"}</span></td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Loan Statement — LoanTracker</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;padding:20px}
  .page{max-width:680px;margin:0 auto}

  /* Header */
  .header{background:linear-gradient(135deg,#00A86B 0%,#007A4D 100%);border-radius:20px 20px 0 0;padding:28px 28px 24px;color:#fff;position:relative;overflow:hidden}
  .header::before{content:'';position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.07);top:-70px;right:-50px}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:18px;position:relative;z-index:1}
  .brand-icon{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:22px}
  .brand-name{font-size:20px;font-weight:700}
  .brand-tag{font-size:11px;opacity:.8;margin-top:1px}
  .stmt-label{font-size:12px;opacity:.8;text-transform:uppercase;letter-spacing:1px;position:relative;z-index:1;margin-bottom:4px}
  .stmt-no{font-size:24px;font-weight:700;position:relative;z-index:1}
  .gen-date{font-size:12px;opacity:.75;position:relative;z-index:1;margin-top:8px}

  /* Borrower card */
  .borrower-card{background:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #F1F5F9}
  .borrower-name{font-size:17px;font-weight:700;color:#1E293B}
  .borrower-info{font-size:13px;color:#64748B;margin-top:3px}
  .loan-status{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .status-active{background:#00A86B18;color:#00A86B}
  .status-completed{background:#3B82F618;color:#3B82F6}

  /* Summary grid */
  .summary-grid{background:#fff;display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #F1F5F9}
  .summary-cell{padding:16px 20px;border-right:1px solid #F1F5F9}
  .summary-cell:last-child{border-right:none}
  .cell-label{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
  .cell-value{font-size:17px;font-weight:700;color:#1E293B}
  .cell-value.green{color:#00A86B}
  .cell-value.amber{color:#F59E0B}

  /* Progress */
  .progress-section{background:#fff;padding:18px 24px;border-bottom:1px solid #F1F5F9}
  .progress-header{display:flex;justify-content:space-between;margin-bottom:8px}
  .progress-title{font-size:14px;font-weight:600;color:#1E293B}
  .progress-pct{font-size:14px;font-weight:700;color:#00A86B}
  .bar-bg{height:10px;background:#F1F5F9;border-radius:5px;overflow:hidden}
  .bar-fill{height:100%;background:linear-gradient(90deg,#00A86B,#7FFFD4);border-radius:5px}
  .progress-footer{display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:#64748B}

  /* Sections */
  .section{background:#fff;margin-top:2px;padding:18px 24px}
  .section-title{font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}

  /* Loan details rows */
  .detail-row{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px}
  .detail-label{color:#64748B}
  .detail-value{font-weight:600;color:#1E293B}

  /* Tables */
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#F8FAFC;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:10px 12px;text-align:left;border-bottom:1px solid #E2E8F0}
  td{padding:10px 12px;border-bottom:1px solid #F8FAFC;color:#1E293B}
  tr:last-child td{border-bottom:none}
  .amt{font-weight:700}
  .green{color:#00A86B}
  .paid-row td{background:#F0FDF4}
  .upcoming-row td{background:#fff}

  /* Badges */
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-paid{background:#00A86B18;color:#00A86B}
  .badge-upcoming{background:#F59E0B18;color:#F59E0B}

  /* Footer */
  .footer{background:#fff;border-radius:0 0 20px 20px;padding:18px 24px;margin-top:2px}
  .footer-text{font-size:11px;color:#94A3B8;line-height:1.7;text-align:center}
  .watermark{text-align:center;margin-top:12px;padding-top:12px;border-top:1px dashed #E2E8F0;font-size:11px;color:#CBD5E1}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-icon">📈</div>
      <div>
        <div class="brand-name">LoanTracker</div>
        <div class="brand-tag">Smart Loan Management</div>
      </div>
    </div>
    <div class="stmt-label">Loan Statement</div>
    <div class="stmt-no">${statementNo}</div>
    <div class="gen-date">Generated on ${generatedOn}</div>
  </div>

  <!-- Borrower -->
  <div class="borrower-card">
    <div>
      <div class="borrower-name">${borrower.name}</div>
      <div class="borrower-info">${borrower.email}</div>
      ${borrower.phone ? `<div class="borrower-info">+91 ${borrower.phone}</div>` : ""}
    </div>
    <span class="loan-status ${loan.status === "completed" ? "status-completed" : "status-active"}">
      ${loan.status === "completed" ? "✓ Completed" : "● Active"}
    </span>
  </div>

  <!-- Summary Grid -->
  <div class="summary-grid">
    <div class="summary-cell">
      <div class="cell-label">Loan Amount</div>
      <div class="cell-value">${fmt(loan.amount)}</div>
    </div>
    <div class="summary-cell">
      <div class="cell-label">Total Paid</div>
      <div class="cell-value green">${fmt(loan.paidAmount)}</div>
    </div>
    <div class="summary-cell">
      <div class="cell-label">Remaining</div>
      <div class="cell-value amber">${fmt(loan.pendingAmount)}</div>
    </div>
  </div>

  <!-- Progress -->
  <div class="progress-section">
    <div class="progress-header">
      <span class="progress-title">Repayment Progress</span>
      <span class="progress-pct">${progress}% Complete</span>
    </div>
    <div class="bar-bg"><div class="bar-fill" style="width:${progress}%"></div></div>
    <div class="progress-footer">
      <span>Started: ${fmtDate(loan.startDate)}</span>
      <span>${Math.ceil(loan.pendingAmount / loan.emi)} EMI${Math.ceil(loan.pendingAmount / loan.emi) !== 1 ? "s" : ""} remaining</span>
    </div>
  </div>

  <!-- Loan Details -->
  <div class="section">
    <div class="section-title">Loan Details</div>
    <div class="detail-row"><span class="detail-label">Principal Amount</span><span class="detail-value">${fmt(loan.amount)}</span></div>
    <div class="detail-row"><span class="detail-label">Interest Rate</span><span class="detail-value">${loan.interest}% per annum</span></div>
    <div class="detail-row"><span class="detail-label">Loan Duration</span><span class="detail-value">${loan.duration} months</span></div>
    <div class="detail-row"><span class="detail-label">Monthly EMI</span><span class="detail-value">${fmt(loan.emi)}</span></div>
    <div class="detail-row"><span class="detail-label">Interest Amount</span><span class="detail-value">${fmt(loan.interestAmount)}</span></div>
    <div class="detail-row"><span class="detail-label">Total Payable</span><span class="detail-value">${fmt(loan.totalAmount)}</span></div>
    <div class="detail-row" style="margin-bottom:0"><span class="detail-label">Start Date</span><span class="detail-value">${fmtDate(loan.startDate)}</span></div>
  </div>

  <!-- Payment History -->
  <div class="section" style="margin-top:2px">
    <div class="section-title">Payment History (${confirmed.length} confirmed)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Amount</th>
          <th>Method</th>
          <th>Note</th>
          <th>Confirmed By</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>

  <!-- EMI Schedule -->
  <div class="section" style="margin-top:2px">
    <div class="section-title">EMI Schedule</div>
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>Due Date</th>
          <th>EMI</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${scheduleRows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-text">
      This is an official loan statement generated by LoanTracker.<br/>
      Statement ID: <strong>${statementNo}</strong> · Keep this document for your records.
    </div>
    <div class="watermark">LoanTracker · Powered by Firebase · ${generatedOn}</div>
  </div>

</div>
</body>
</html>`;
}

export async function downloadLoanStatement(
  loan: Loan,
  borrower: UserProfile,
  payments: Payment[]
): Promise<void> {
  const html = buildStatementHTML(loan, borrower, payments);

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Save Loan Statement",
      UTI: "com.adobe.pdf",
    });
  }
}
