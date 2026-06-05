import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { getLoanById } from "@/lib/services/loanService";
import { getLoanPayments } from "@/lib/services/paymentService";
import { Loan, Payment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { format, addMonths } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

interface Props { loanId: string; }

export default function BorrowerLoanDetail({ loanId }: Props) {
  const [, setLocation] = useLocation();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [l, p] = await Promise.all([getLoanById(loanId), getLoanPayments(loanId)]);
      setLoan(l);
      setPayments(p);
      setLoading(false);
    };
    load();
  }, [loanId]);

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    </AppLayout>
  );

  if (!loan) return (
    <AppLayout>
      <div className="p-6">
        <p className="text-muted-foreground">Loan not found.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/loans")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
      </div>
    </AppLayout>
  );

  const progress = (loan.paidAmount / loan.totalAmount) * 100;
  const startDate = new Date(loan.startDate);

  const schedule = Array.from({ length: loan.duration }, (_, i) => {
    const r = loan.interest / 100 / 12;
    let balance = loan.amount;
    for (let j = 0; j < i; j++) {
      const ip = balance * r;
      const pp = loan.emi - ip;
      balance = Math.max(0, balance - pp);
    }
    const ip = balance * r;
    const pp = Math.min(loan.emi - ip, balance);
    return {
      month: i + 1,
      date: format(addMonths(startDate, i), "MMM yyyy"),
      emi: loan.emi,
      interest: ip,
      principal: pp,
      balance: Math.max(0, balance - pp),
    };
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/loans")} data-testid="btn-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold text-foreground">Loan Detail</h2>
          <Badge variant={loan.status === "active" ? "default" : "secondary"}>{loan.status}</Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Principal", value: fmt(loan.amount) },
                { label: "Annual Rate", value: `${loan.interest}%` },
                { label: "Duration", value: `${loan.duration} months` },
                { label: "Monthly EMI", value: fmt(loan.emi) },
                { label: "Total Payable", value: fmt(loan.totalAmount) },
                { label: "Total Interest", value: fmt(loan.interestAmount) },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                <span>{fmt(loan.paidAmount)} paid</span>
                <span>{fmt(loan.pendingAmount)} remaining</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Started {format(startDate, "dd MMMM yyyy")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`payment-${p.id}`}>
                    <div className="flex items-center gap-2">
                      {p.status === "confirmed" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> :
                        p.status === "rejected" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                          <Clock className="h-3.5 w-3.5 text-amber-500" />}
                      <div>
                        <p className="text-sm font-medium">{fmt(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy")} · {p.paymentMode || "—"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      p.status === "confirmed" ? "text-primary border-primary/30 bg-primary/5" :
                        p.status === "rejected" ? "text-destructive border-destructive/30 bg-destructive/5" :
                          "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950"
                    }>{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">EMI Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Month</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">EMI</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">Principal</th>
                    <th className="text-right px-4 py-2 text-muted-foreground font-medium">Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(row => (
                    <tr key={row.month} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{row.month}</td>
                      <td className="px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(row.emi)}</td>
                      <td className="px-4 py-2 text-right text-primary">{fmt(row.principal)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{fmt(row.interest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
