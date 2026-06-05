import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getUserLoans } from "@/lib/services/loanService";
import { getUserPayments } from "@/lib/services/paymentService";
import { getNotifications, markAsRead } from "@/lib/services/notificationService";
import { Loan, Payment, Notification } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, Bell, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function BorrowerDashboard() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      const [l, p, n] = await Promise.all([
        getUserLoans(profile.id),
        getUserPayments(profile.id),
        getNotifications(profile.id),
      ]);
      setLoans(l);
      setPayments(p);
      setNotifications(n);
      setLoading(false);
    };
    load();
  }, [profile]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeLoans = loans.filter(l => l.status === "active");
  const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout unreadCount={unreadCount}>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Hello, {profile?.name?.split(" ")[0]}</h2>
          <p className="text-sm text-muted-foreground">Here's your loan summary</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Borrowed", value: fmt(totalBorrowed), icon: <CreditCard className="h-4 w-4" />, color: "text-chart-2" },
            { label: "Total Paid", value: fmt(totalPaid), icon: <TrendingUp className="h-4 w-4" />, color: "text-primary" },
            { label: "Remaining", value: fmt(totalPending), icon: <AlertCircle className="h-4 w-4" />, color: "text-chart-5" },
            { label: "Active Loans", value: activeLoans.length.toString(), icon: <CreditCard className="h-4 w-4" />, color: "text-chart-3" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <p className="text-xl font-bold text-foreground" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeLoans.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Active Loans</h3>
            {activeLoans.map(loan => (
              <Card key={loan.id} data-testid={`loan-${loan.id}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{fmt(loan.amount)} loan</p>
                      <p className="text-xs text-muted-foreground">{fmt(loan.emi)}/month · {loan.interest}% p.a.</p>
                    </div>
                    <Link href={`/loans/${loan.id}`} asChild>
                      <Button variant="outline" size="sm" className="text-xs">View</Button>
                    </Link>
                  </div>
                  <Progress value={(loan.paidAmount / loan.totalAmount) * 100} className="h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                    <span>{fmt(loan.paidAmount)} paid</span>
                    <span>{fmt(loan.pendingAmount)} left</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Recent Payments
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet. <Link href="/pay" className="text-primary hover:underline">Make one</Link></p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`payment-${p.id}`}>
                  <div className="flex items-center gap-2">
                    {p.status === "confirmed" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> :
                      p.status === "rejected" ? <XCircle className="h-3.5 w-3.5 text-destructive" /> :
                        <Clock className="h-3.5 w-3.5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy")}</p>
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

        {notifications.some(n => !n.read) && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notifications
            </h3>
            {notifications.filter(n => !n.read).map(n => (
              <div key={n.id} className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5" data-testid={`notif-${n.id}`}>
                <Bell className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(n.createdAt), "dd MMM yyyy, HH:mm")}</p>
                </div>
                <button onClick={() => handleMarkRead(n.id)} className="text-xs text-primary hover:underline flex-shrink-0">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
