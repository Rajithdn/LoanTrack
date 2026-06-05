import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getUserLoans } from "@/lib/services/loanService";
import { getUserPayments } from "@/lib/services/paymentService";
import { Loan, Payment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function BorrowerStatement() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getUserLoans(profile.id), getUserPayments(profile.id)]).then(([l, p]) => {
      setLoans(l);
      setPayments(p);
      setLoading(false);
    });
  }, [profile]);

  const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);
  const totalInterest = loans.reduce((s, l) => s + l.interestAmount, 0);

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const now = format(new Date(), "dd MMM yyyy, HH:mm");

      doc.setFontSize(18);
      doc.setTextColor(20, 83, 45);
      doc.text("LoanTracker", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Account Statement — ${profile?.name}`, 14, 28);
      doc.text(`Generated: ${now}`, 14, 34);
      doc.text(`Email: ${profile?.email}`, 14, 40);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 44, pageW - 14, 44);

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text("Summary", 14, 52);

      autoTable(doc, {
        startY: 56,
        head: [["Total Loans", "Total Borrowed", "Total Paid", "Total Pending", "Total Interest"]],
        body: [[loans.length, fmt(totalBorrowed), fmt(totalPaid), fmt(totalPending), fmt(totalInterest)]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [20, 83, 45], textColor: 255 },
      });

      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const afterSummary = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Loan Details", 14, afterSummary);

      autoTable(doc, {
        startY: afterSummary + 4,
        head: [["Amount", "Interest", "Duration", "EMI", "Paid", "Pending", "Status"]],
        body: loans.map(l => [
          fmt(l.amount), `${l.interest}%`, `${l.duration} mo`,
          fmt(l.emi), fmt(l.paidAmount), fmt(l.pendingAmount), l.status
        ]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
      });

      const afterLoans = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text("Payment History", 14, afterLoans);

      autoTable(doc, {
        startY: afterLoans + 4,
        head: [["Date", "Amount", "Mode", "Status", "Note"]],
        body: payments.map(p => [
          format(new Date(p.date), "dd MMM yyyy"),
          fmt(p.amount),
          p.paymentMode || "—",
          p.status,
          p.note || "—"
        ]),
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [80, 80, 80], textColor: 255 },
      });

      const fileName = `LoanTracker_Statement_${profile?.name?.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(fileName);
      toast.success("Statement downloaded");
    } catch (e: any) {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Account Statement</h2>
            <p className="text-sm text-muted-foreground">Complete financial summary</p>
          </div>
          <Button size="sm" onClick={downloadPDF} disabled={pdfLoading || loans.length === 0} data-testid="btn-download-pdf">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Borrowed", value: fmt(totalBorrowed) },
            { label: "Total Paid", value: fmt(totalPaid) },
            { label: "Total Pending", value: fmt(totalPending) },
            { label: "Total Interest", value: fmt(totalInterest) },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-bold text-foreground mt-0.5" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Loans ({loans.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No loans</p>
            ) : loans.map(l => (
              <div key={l.id} className="py-2 border-b border-border last:border-0" data-testid={`loan-${l.id}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">{fmt(l.amount)} @ {l.interest}% · {l.duration}mo</span>
                  <Badge variant={l.status === "active" ? "default" : "secondary"} className="text-xs">{l.status}</Badge>
                </div>
                <Progress value={(l.paidAmount / l.totalAmount) * 100} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{fmt(l.paidAmount)} paid</span>
                  <span>{fmt(l.pendingAmount)} left</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Payment History ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments yet</p>
            ) : (
              <div className="space-y-0">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`payment-${p.id}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.date), "dd MMM yyyy")}
                        {p.paymentMode ? ` · ${p.paymentMode}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={
                      p.status === "confirmed" ? "text-primary border-primary/30 bg-primary/5 text-xs" :
                        p.status === "rejected" ? "text-destructive border-destructive/30 bg-destructive/5 text-xs" :
                          "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 text-xs"
                    }>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
