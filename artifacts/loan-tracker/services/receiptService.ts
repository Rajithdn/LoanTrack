import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { Payment } from "./paymentService";
import type { Loan } from "./loanService";
import type { UserProfile } from "./authService";

function buildReceiptHTML(
  payment: Payment,
  loan: Loan,
  borrower: UserProfile,
  confirmedBy: string
): string {
  const receiptNo = `LT-${payment.id.slice(-8).toUpperCase()}`;
  const confirmedDate = payment.confirmedAt
    ? new Date(payment.confirmedAt).toLocaleString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
  const submittedDate = new Date(payment.date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const totalPaid = loan.paidAmount;
  const remaining = loan.pendingAmount;
  const progressPct = Math.min(100, Math.round((totalPaid / loan.totalAmount) * 100));
  const monthsLeft = Math.ceil(remaining / loan.emi);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt — LoanTracker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F8FAFC;
      color: #1E293B;
      padding: 24px;
      min-height: 100vh;
    }
    .page { max-width: 520px; margin: 0 auto; }

    /* Header */
    .header {
      background: linear-gradient(135deg, #00A86B 0%, #007A4D 100%);
      border-radius: 20px 20px 0 0;
      padding: 32px 28px 24px;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      width: 180px; height: 180px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      top: -60px; right: -40px;
    }
    .header::after {
      content: '';
      position: absolute;
      width: 120px; height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
      bottom: -30px; left: -20px;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; position: relative; z-index: 1; }
    .brand-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .brand-name { font-size: 22px; font-weight: 700; }
    .brand-tag { font-size: 11px; opacity: 0.8; margin-top: 1px; }
    .receipt-title { font-size: 13px; opacity: 0.85; margin-bottom: 6px; position: relative; z-index: 1; text-transform: uppercase; letter-spacing: 1px; }
    .receipt-no { font-size: 26px; font-weight: 700; position: relative; z-index: 1; letter-spacing: 0.5px; }
    .confirmed-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,0.18); border-radius: 20px;
      padding: 5px 12px; margin-top: 12px;
      font-size: 12px; font-weight: 600; position: relative; z-index: 1;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #7FFFD4; display: inline-block; }

    /* Amount card */
    .amount-card {
      background: #fff;
      border-left: 4px solid #00A86B;
      padding: 20px 24px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .amount-label { font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .amount-value { font-size: 34px; font-weight: 700; color: #00A86B; }
    .amount-mode { font-size: 12px; color: #64748B; margin-top: 4px; }
    .mode-badge {
      background: #00A86B18; color: #00A86B; padding: 6px 14px;
      border-radius: 20px; font-size: 13px; font-weight: 600;
    }

    /* Details section */
    .section { background: #fff; padding: 20px 24px; border-top: 1px solid #F1F5F9; }
    .section-title {
      font-size: 11px; font-weight: 700; color: #94A3B8;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;
    }
    .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .row:last-child { margin-bottom: 0; }
    .row-label { font-size: 13px; color: #64748B; flex: 1; }
    .row-value { font-size: 13px; font-weight: 600; color: #1E293B; text-align: right; flex: 1; }
    .row-value.green { color: #00A86B; }

    /* Progress bar */
    .progress-section { background: #fff; padding: 20px 24px; border-top: 1px solid #F1F5F9; }
    .progress-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .progress-title { font-size: 13px; font-weight: 600; color: #1E293B; }
    .progress-pct { font-size: 13px; font-weight: 700; color: #00A86B; }
    .progress-bar-bg { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
    .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #00A86B, #7FFFD4); border-radius: 4px; }
    .progress-footer { display: flex; justify-content: space-between; margin-top: 8px; }
    .progress-paid { font-size: 12px; color: #64748B; }
    .progress-remaining { font-size: 12px; color: #64748B; }

    /* Note */
    .note-section { background: #FFFBEB; padding: 14px 24px; border-top: 1px solid #FEF3C7; display: flex; gap: 10px; align-items: flex-start; }
    .note-icon { font-size: 14px; margin-top: 1px; }
    .note-text { font-size: 12px; color: #92400E; line-height: 1.5; }

    /* Footer */
    .footer {
      background: #fff;
      border-top: 1px solid #F1F5F9;
      border-radius: 0 0 20px 20px;
      padding: 20px 24px;
    }
    .footer-row { display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 11px; color: #94A3B8; line-height: 1.6; }
    .footer-right { text-align: right; font-size: 11px; color: #94A3B8; }
    .watermark { text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #E2E8F0; font-size: 11px; color: #CBD5E1; }

    /* Divider between sections */
    .divider { height: 1px; background: #F1F5F9; }

    /* Zigzag tear effect */
    .tear {
      height: 16px;
      background:
        radial-gradient(circle at 50% 0%, #F8FAFC 12px, transparent 12px),
        linear-gradient(#fff, #fff);
      background-size: 24px 16px;
      background-position: 0 0;
    }
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
    <div class="receipt-title">Payment Receipt</div>
    <div class="receipt-no">${receiptNo}</div>
    <div class="confirmed-badge">
      <span class="dot"></span>
      Confirmed &nbsp;·&nbsp; ${confirmedDate}
    </div>
  </div>

  <!-- Amount -->
  <div class="amount-card">
    <div>
      <div class="amount-label">Amount Paid</div>
      <div class="amount-value">₹${payment.amount.toLocaleString("en-IN")}</div>
      <div class="amount-mode">via ${payment.paymentMode ?? "Cash"}</div>
    </div>
    <div class="mode-badge">${payment.paymentMode ?? "Cash"}</div>
  </div>

  <!-- Borrower Details -->
  <div class="section">
    <div class="section-title">Borrower Details</div>
    <div class="row">
      <span class="row-label">Full Name</span>
      <span class="row-value">${borrower.name}</span>
    </div>
    <div class="row">
      <span class="row-label">Email</span>
      <span class="row-value">${borrower.email}</span>
    </div>
    ${borrower.phone ? `<div class="row"><span class="row-label">Phone</span><span class="row-value">+91 ${borrower.phone}</span></div>` : ""}
  </div>

  <!-- Loan Details -->
  <div class="section">
    <div class="section-title">Loan Details</div>
    <div class="row">
      <span class="row-label">Loan Amount</span>
      <span class="row-value">₹${loan.amount.toLocaleString("en-IN")}</span>
    </div>
    <div class="row">
      <span class="row-label">Interest Rate</span>
      <span class="row-value">${loan.interest}% per annum</span>
    </div>
    <div class="row">
      <span class="row-label">Monthly EMI</span>
      <span class="row-value">₹${loan.emi.toLocaleString("en-IN")}</span>
    </div>
    <div class="row">
      <span class="row-label">Total Payable</span>
      <span class="row-value">₹${loan.totalAmount.toLocaleString("en-IN")}</span>
    </div>
    <div class="row">
      <span class="row-label">Payment Submitted</span>
      <span class="row-value">${submittedDate}</span>
    </div>
    <div class="row">
      <span class="row-label">Confirmed By</span>
      <span class="row-value green">${confirmedBy}</span>
    </div>
  </div>

  <!-- Progress -->
  <div class="progress-section">
    <div class="section-title">Repayment Progress</div>
    <div class="progress-header">
      <span class="progress-title">Total Repaid</span>
      <span class="progress-pct">${progressPct}% complete</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
    </div>
    <div class="progress-footer">
      <span class="progress-paid">Paid: ₹${totalPaid.toLocaleString("en-IN")}</span>
      <span class="progress-remaining">Remaining: ₹${remaining.toLocaleString("en-IN")} (~${monthsLeft} EMI${monthsLeft !== 1 ? "s" : ""})</span>
    </div>
  </div>

  ${payment.note ? `
  <!-- Note -->
  <div class="note-section">
    <span class="note-icon">📝</span>
    <span class="note-text"><strong>Transaction Note:</strong> ${payment.note}</span>
  </div>` : ""}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-row">
      <div class="footer-left">
        This is an official payment receipt<br />
        generated by LoanTracker.<br />
        Keep this for your records.
      </div>
      <div class="footer-right">
        Receipt ID<br />
        <strong>${receiptNo}</strong><br />
        ${new Date().toLocaleDateString("en-IN")}
      </div>
    </div>
    <div class="watermark">
      LoanTracker · Powered by Firebase · Generated on ${new Date().toLocaleString("en-IN")}
    </div>
  </div>
</div>
</body>
</html>`;
}

export async function downloadPaymentReceipt(
  payment: Payment,
  loan: Loan,
  borrower: UserProfile,
  confirmedBy: string
): Promise<void> {
  const html = buildReceiptHTML(payment, loan, borrower, confirmedBy);

  if (Platform.OS === "web") {
    // Web: open print dialog
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
    return;
  }

  // Native: generate PDF via expo-print then share
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Receipt — ${payment.id.slice(-8).toUpperCase()}`,
      UTI: "com.adobe.pdf",
    });
  }
}
