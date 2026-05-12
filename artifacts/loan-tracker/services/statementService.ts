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

function buildAdminReportHTML(borrower: UserProfile, loans: Loan[], allPayments: Payment[]): string {
  const reportNo = `AR-${borrower.id.slice(-8).toUpperCase()}`;
  const generatedOn = new Date().toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);
  const totalInterest = loans.reduce((s, l) => s + l.interestAmount, 0);
  const activeCount = loans.filter((l) => l.status === "active").length;
  const completedCount = loans.filter((l) => l.status === "completed").length;
  const confirmedPayments = allPayments.filter((p) => p.status === "confirmed");
  const overallProgress = totalBorrowed > 0 ? Math.min(100, Math.round((totalPaid / (totalBorrowed + totalInterest)) * 100)) : 0;

  const loanSections = loans.length
    ? loans.map((loan, idx) => {
        const loanPayments = confirmedPayments
          .filter((p) => p.loanId === loan.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const progress = Math.min(100, Math.round((loan.paidAmount / loan.totalAmount) * 100));
        const schedule = buildEMISchedule(loan);

        const paymentRows = loanPayments.length
          ? loanPayments.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${fmtDate(p.date)}</td>
                <td class="amt green">${fmt(p.amount)}</td>
                <td>${p.paymentMode ?? "Cash"}</td>
                <td>${p.note ? p.note.slice(0, 30) : "—"}</td>
              </tr>`).join("")
          : `<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:14px">No confirmed payments</td></tr>`;

        const scheduleRows = schedule.map((r) => `
          <tr class="${r.status === "paid" ? "paid-row" : "upcoming-row"}">
            <td>${r.month}</td>
            <td>${r.dueDate}</td>
            <td class="amt">${fmt(r.emi)}</td>
            <td><span class="badge ${r.status === "paid" ? "badge-paid" : "badge-upcoming"}">${r.status === "paid" ? "✓ Paid" : "Upcoming"}</span></td>
          </tr>`).join("");

        return `
          <div class="loan-block">
            <div class="loan-block-header">
              <span class="loan-index">Loan #${idx + 1}</span>
              <span class="loan-status-badge ${loan.status === "completed" ? "status-completed" : "status-active"}">
                ${loan.status === "completed" ? "✓ Completed" : "● Active"}
              </span>
            </div>
            <div class="loan-details-grid">
              <div class="ld-item"><span class="ld-label">Principal</span><span class="ld-val">${fmt(loan.amount)}</span></div>
              <div class="ld-item"><span class="ld-label">Interest</span><span class="ld-val">${loan.interest}% p.a.</span></div>
              <div class="ld-item"><span class="ld-label">Duration</span><span class="ld-val">${loan.duration} months</span></div>
              <div class="ld-item"><span class="ld-label">EMI</span><span class="ld-val">${fmt(loan.emi)}</span></div>
              <div class="ld-item"><span class="ld-label">Interest Amt</span><span class="ld-val">${fmt(loan.interestAmount)}</span></div>
              <div class="ld-item"><span class="ld-label">Total Payable</span><span class="ld-val">${fmt(loan.totalAmount)}</span></div>
              <div class="ld-item"><span class="ld-label">Paid</span><span class="ld-val green">${fmt(loan.paidAmount)}</span></div>
              <div class="ld-item"><span class="ld-label">Remaining</span><span class="ld-val amber">${fmt(loan.pendingAmount)}</span></div>
              <div class="ld-item"><span class="ld-label">Start Date</span><span class="ld-val">${fmtDate(loan.startDate)}</span></div>
              <div class="ld-item"><span class="ld-label">Progress</span><span class="ld-val">${progress}%</span></div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bg"><div class="progress-fill" style="width:${progress}%"></div></div>
            </div>

            <div class="sub-section-title">Payment History (${loanPayments.length} payments)</div>
            <table>
              <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
              <tbody>${paymentRows}</tbody>
            </table>

            <div class="sub-section-title" style="margin-top:14px">EMI Schedule (${loan.duration} months)</div>
            <table>
              <thead><tr><th>Month</th><th>Due Date</th><th>EMI</th><th>Status</th></tr></thead>
              <tbody>${scheduleRows}</tbody>
            </table>
          </div>`;
      }).join("")
    : `<div style="text-align:center;color:#94A3B8;padding:30px">No loans on record</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Borrower Report — ${borrower.name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;padding:20px}
  .page{max-width:700px;margin:0 auto}

  .header{background:linear-gradient(135deg,#1E293B 0%,#334155 100%);border-radius:20px 20px 0 0;padding:28px 28px 24px;color:#fff;position:relative;overflow:hidden}
  .header::before{content:'';position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.05);top:-70px;right:-50px}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:18px;position:relative;z-index:1}
  .brand-icon{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px}
  .brand-name{font-size:20px;font-weight:700}
  .brand-tag{font-size:11px;opacity:.8;margin-top:1px}
  .report-label{font-size:12px;opacity:.7;text-transform:uppercase;letter-spacing:1px;position:relative;z-index:1;margin-bottom:4px}
  .report-no{font-size:24px;font-weight:700;position:relative;z-index:1}
  .gen-date{font-size:12px;opacity:.7;position:relative;z-index:1;margin-top:8px}
  .admin-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;position:relative;z-index:1;margin-top:10px}

  .borrower-card{background:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F1F5F9}
  .borrower-avatar{width:52px;height:52px;border-radius:50%;background:#00A86B18;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#00A86B;margin-right:16px;flex-shrink:0}
  .borrower-info{flex:1}
  .borrower-name{font-size:18px;font-weight:700;color:#1E293B}
  .borrower-meta{font-size:13px;color:#64748B;margin-top:3px}

  .overview-grid{background:#fff;display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #F1F5F9}
  .ov-cell{padding:16px 14px;border-right:1px solid #F1F5F9;text-align:center}
  .ov-cell:last-child{border-right:none}
  .ov-label{font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
  .ov-value{font-size:16px;font-weight:700;color:#1E293B}

  .summary-section{background:#fff;padding:18px 24px;border-bottom:1px solid #F1F5F9}
  .summary-title{font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
  .summary-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:13px}
  .summary-label{color:#64748B}
  .summary-value{font-weight:700;color:#1E293B}
  .green{color:#00A86B}
  .amber{color:#F59E0B}
  .red{color:#EF4444}
  .progress-section{padding:14px 0 6px}
  .progress-header{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px}
  .progress-bg{height:8px;background:#F1F5F9;border-radius:4px;overflow:hidden}
  .progress-fill{height:100%;background:linear-gradient(90deg,#00A86B,#7FFFD4);border-radius:4px}

  .loans-section{background:#fff;padding:0 24px;margin-top:2px}
  .loans-header{padding:18px 0 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F1F5F9}
  .loans-title{font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px}
  .loans-count{font-size:12px;color:#64748B}

  .loan-block{padding:18px 0;border-bottom:1px dashed #E2E8F0}
  .loan-block:last-child{border-bottom:none}
  .loan-block-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .loan-index{font-size:14px;font-weight:700;color:#1E293B}
  .loan-status-badge{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
  .status-active{background:#00A86B18;color:#00A86B}
  .status-completed{background:#3B82F618;color:#3B82F6}

  .loan-details-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
  .ld-item{display:flex;justify-content:space-between;font-size:12px;padding:6px 10px;background:#F8FAFC;border-radius:6px}
  .ld-label{color:#64748B}
  .ld-val{font-weight:600;color:#1E293B}
  .ld-val.green{color:#00A86B}
  .ld-val.amber{color:#F59E0B}

  .progress-bar-wrap{margin-bottom:14px}
  .sub-section-title{font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}

  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#F8FAFC;color:#64748B;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;border-bottom:1px solid #E2E8F0}
  td{padding:8px 10px;border-bottom:1px solid #F8FAFC;color:#1E293B}
  tr:last-child td{border-bottom:none}
  .amt{font-weight:700}
  .paid-row td{background:#F0FDF4}
  .upcoming-row td{background:#fff}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
  .badge-paid{background:#00A86B18;color:#00A86B}
  .badge-upcoming{background:#F59E0B18;color:#F59E0B}

  .footer{background:#fff;border-radius:0 0 20px 20px;padding:18px 24px;margin-top:2px}
  .footer-text{font-size:11px;color:#94A3B8;line-height:1.7;text-align:center}
  .watermark{text-align:center;margin-top:10px;padding-top:10px;border-top:1px dashed #E2E8F0;font-size:10px;color:#CBD5E1}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand">
      <div class="brand-icon">📈</div>
      <div>
        <div class="brand-name">LoanTracker</div>
        <div class="brand-tag">Admin Borrower Report</div>
      </div>
    </div>
    <div class="report-label">Borrower Report</div>
    <div class="report-no">${reportNo}</div>
    <div class="gen-date">Generated on ${generatedOn}</div>
    <div class="admin-badge">🔒 Admin Confidential</div>
  </div>

  <div class="borrower-card">
    <div style="display:flex;align-items:center">
      <div class="borrower-avatar">${borrower.name.charAt(0).toUpperCase()}</div>
      <div class="borrower-info">
        <div class="borrower-name">${borrower.name}</div>
        <div class="borrower-meta">${borrower.email}${borrower.phone ? ` · +91 ${borrower.phone}` : ""}</div>
        <div class="borrower-meta" style="margin-top:2px">User ID: ${borrower.id.slice(0, 16)}…</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#94A3B8;margin-bottom:4px">${activeCount} active · ${completedCount} completed</div>
      <div style="font-size:18px;font-weight:700;color:#1E293B">${loans.length} loan${loans.length !== 1 ? "s" : ""}</div>
    </div>
  </div>

  <div class="overview-grid">
    <div class="ov-cell">
      <div class="ov-label">Total Borrowed</div>
      <div class="ov-value">${fmt(totalBorrowed)}</div>
    </div>
    <div class="ov-cell">
      <div class="ov-label">Total Paid</div>
      <div class="ov-value" style="color:#00A86B">${fmt(totalPaid)}</div>
    </div>
    <div class="ov-cell">
      <div class="ov-label">Total Pending</div>
      <div class="ov-value" style="color:#F59E0B">${fmt(totalPending)}</div>
    </div>
    <div class="ov-cell">
      <div class="ov-label">Payments</div>
      <div class="ov-value">${confirmedPayments.length}</div>
    </div>
  </div>

  <div class="summary-section">
    <div class="summary-title">Financial Overview</div>
    <div class="summary-row"><span class="summary-label">Total Principal Borrowed</span><span class="summary-value">${fmt(totalBorrowed)}</span></div>
    <div class="summary-row"><span class="summary-label">Total Interest Charged</span><span class="summary-value">${fmt(totalInterest)}</span></div>
    <div class="summary-row"><span class="summary-label">Total Amount Payable</span><span class="summary-value">${fmt(totalBorrowed + totalInterest)}</span></div>
    <div class="summary-row"><span class="summary-label">Total Amount Paid</span><span class="summary-value green">${fmt(totalPaid)}</span></div>
    <div class="summary-row" style="margin-bottom:0"><span class="summary-label">Total Amount Pending</span><span class="summary-value amber">${fmt(totalPending)}</span></div>
    <div class="progress-section">
      <div class="progress-header">
        <span style="color:#64748B">Overall Repayment Progress</span>
        <span style="font-weight:700;color:#00A86B">${overallProgress}%</span>
      </div>
      <div class="progress-bg"><div class="progress-fill" style="width:${overallProgress}%"></div></div>
    </div>
  </div>

  <div class="loans-section">
    <div class="loans-header">
      <span class="loans-title">Loan-wise Breakdown</span>
      <span class="loans-count">${loans.length} loan${loans.length !== 1 ? "s" : ""} · ${confirmedPayments.length} confirmed payment${confirmedPayments.length !== 1 ? "s" : ""}</span>
    </div>
    ${loanSections}
  </div>

  <div class="footer">
    <div class="footer-text">
      This is a confidential admin report generated by LoanTracker.<br/>
      Report ID: <strong>${reportNo}</strong> · For authorized personnel only.
    </div>
    <div class="watermark">LoanTracker Admin · ${generatedOn}</div>
  </div>

</div>
</body>
</html>`;
}

export async function downloadAdminBorrowerReport(
  borrower: UserProfile,
  loans: Loan[],
  allPayments: Payment[]
): Promise<void> {
  const html = buildAdminReportHTML(borrower, loans, allPayments);

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
      dialogTitle: `${borrower.name} — Borrower Report`,
      UTI: "com.adobe.pdf",
    });
  }
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
