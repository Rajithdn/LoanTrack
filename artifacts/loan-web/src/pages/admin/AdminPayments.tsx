import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getPendingPayments, confirmPayment, rejectPayment, getUserPayments } from "@/lib/services/paymentService";
import { getLoans } from "@/lib/services/loanService";
import { Payment, Loan } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const MODES = ["PhonePe", "Google Pay", "Cash", "Bank Transfer"];

export default function AdminPayments() {
  const { profile } = useAuth();
  const [pending, setPending] = useState<Payment[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [mode, setMode] = useState("Cash");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [pen, l] = await Promise.all([getPendingPayments(), getLoans()]);
      setPending(pen);
      setLoans(l);
      // Get all confirmed/rejected by fetching all user payments then filtering
      const allUserIds = [...new Set(l.map(ln => ln.userId))];
      const allPmts: Payment[] = [];
      await Promise.all(allUserIds.map(async uid => {
        const p = await getUserPayments(uid);
        allPmts.push(...p);
      }));
      setAllPayments(allPmts.filter(p => p.status !== "pending").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } finally {
      setLoading(false);
    }
  };

  const getLoanInfo = (loanId: string) => loans.find(l => l.id === loanId);

  const handleConfirm = async () => {
    if (!selected || !profile) return;
    setProcessing(true);
    try {
      await confirmPayment(selected.id, profile.id, { paymentMode: mode, note });
      toast.success("Payment confirmed");
      setSelected(null); setNote(""); setMode("Cash");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !profile) return;
    setProcessing(true);
    try {
      await rejectPayment(selected.id, profile.id, note);
      toast.success("Payment rejected");
      setSelected(null); setNote("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Payments</h2>
          <p className="text-sm text-muted-foreground">{pending.length} awaiting approval</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending {pending.length > 0 && <Badge variant="destructive" className="ml-1.5 h-4 text-xs">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No pending payments</CardContent></Card>
            ) : pending.map(p => {
              const loan = getLoanInfo(p.loanId);
              return (
                <Card key={p.id} data-testid={`pending-${p.id}`}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                          <p className="text-sm font-semibold text-foreground">{fmt(p.amount)}</p>
                          {p.paymentMode && <span className="text-xs text-muted-foreground">· {p.paymentMode}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(p.date), "dd MMM yyyy, HH:mm")}
                          {loan && ` · Loan: ${fmt(loan.amount)}`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { setSelected(p); setNote(""); setMode("Cash"); }} data-testid={`btn-review-${p.id}`}>
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {allPayments.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No payment history</CardContent></Card>
            ) : allPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0" data-testid={`history-${p.id}`}>
                <div className="flex items-center gap-2">
                  {p.status === "confirmed" ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.date), "dd MMM yyyy")} · {p.paymentMode || "—"}</p>
                  </div>
                </div>
                <Badge variant="outline" className={p.status === "confirmed" ? "text-primary border-primary/30 bg-primary/5" : "text-destructive border-destructive/30 bg-destructive/5"}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Payment</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 pt-1">
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmt(selected.amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(selected.date), "dd MMM yyyy, HH:mm")}</span></div>
                  {selected.paymentMode && <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span>{selected.paymentMode}</span></div>}
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Note (optional)</Label>
                  <Input placeholder="Any remarks..." value={note} onChange={e => setNote(e.target.value)} data-testid="input-note" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleConfirm} disabled={processing} className="flex-1" data-testid="btn-confirm">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirm
                  </Button>
                  <Button variant="destructive" onClick={handleReject} disabled={processing} className="flex-1" data-testid="btn-reject">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
