import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getUserPayments } from "@/lib/services/paymentService";
import { Payment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function BorrowerPayments() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getUserPayments(profile.id).then(p => {
      setPayments(p);
      setLoading(false);
    });
  }, [profile]);

  const confirmed = payments.filter(p => p.status === "confirmed");
  const pending = payments.filter(p => p.status === "pending");
  const rejected = payments.filter(p => p.status === "rejected");
  const totalPaid = confirmed.reduce((s, p) => s + p.amount, 0);

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Payment History</h2>
          <p className="text-sm text-muted-foreground">{payments.length} payments · {fmt(totalPaid)} confirmed</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Confirmed", count: confirmed.length, color: "text-primary" },
            { label: "Pending", count: pending.length, color: "text-amber-500" },
            { label: "Rejected", count: rejected.length, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No payments yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0" data-testid={`payment-${p.id}`}>
                <div className="flex items-center gap-3">
                  {p.status === "confirmed" ? <CheckCircle2 className="h-4 w-4 text-primary" /> :
                    p.status === "rejected" ? <XCircle className="h-4 w-4 text-destructive" /> :
                      <Clock className="h-4 w-4 text-amber-500" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.date), "dd MMM yyyy")}
                      {p.paymentMode ? ` · ${p.paymentMode}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
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
      </div>
    </AppLayout>
  );
}
