import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getLoans } from "@/lib/services/loanService";
import { getPendingPayments, getUserPayments } from "@/lib/services/paymentService";
import { getUsers } from "@/lib/services/userService";
import { Loan, Payment, UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, CreditCard, BanknoteIcon, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const COLORS = ["hsl(160,84%,39%)", "hsl(222,47%,45%)", "hsl(38,92%,50%)", "hsl(262,83%,58%)", "hsl(0,84%,60%)"];

export default function AdminDashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [l, p, u] = await Promise.all([getLoans(), getPendingPayments(), getUsers()]);
      setLoans(l);
      setPayments(p);
      setUsers(u);
      setLoading(false);
    };
    load();
  }, []);

  const totalLent = loans.reduce((s, l) => s + l.amount, 0);
  const totalCollected = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);
  const activeLoans = loans.filter(l => l.status === "active").length;
  const completedLoans = loans.filter(l => l.status === "completed").length;

  const loanStatusData = [
    { name: "Active", value: activeLoans },
    { name: "Completed", value: completedLoans },
  ];

  const monthlyData = (() => {
    const map: Record<string, number> = {};
    loans.forEach(l => {
      const key = format(new Date(l.startDate), "MMM yy");
      map[key] = (map[key] || 0) + l.amount;
    });
    return Object.entries(map).slice(-6).map(([name, amount]) => ({ name, amount }));
  })();

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">Portfolio summary at a glance</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Lent", value: fmt(totalLent), icon: <BanknoteIcon className="h-4 w-4" />, color: "text-primary" },
            { label: "Collected", value: fmt(totalCollected), icon: <TrendingUp className="h-4 w-4" />, color: "text-chart-1" },
            { label: "Pending", value: fmt(totalPending), icon: <AlertCircle className="h-4 w-4" />, color: "text-chart-5" },
            { label: "Borrowers", value: users.length.toString(), icon: <Users className="h-4 w-4" />, color: "text-chart-2" },
          ].map(s => (
            <Card key={s.label} data-testid={`stat-${s.label.toLowerCase().replace(" ", "-")}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Monthly Disbursement</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No loan data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={v => "₹" + (v / 1000) + "k"} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="amount" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Loan Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={loanStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {loanStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 12 }}>{v}</span>} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Pending Approvals
              {payments.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 text-xs">{payments.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending payments</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`payment-${p.id}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy")}</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                      Pending
                    </Badge>
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
