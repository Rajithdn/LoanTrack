import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { getLoans, createLoan, calculateEMI } from "@/lib/services/loanService";
import { getUsers } from "@/lib/services/userService";
import { Loan, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Plus, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function AdminLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [duration, setDuration] = useState("");
  const [preview, setPreview] = useState<{ emi: number; total: number; interest: number } | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [l, u] = await Promise.all([getLoans(), getUsers()]);
    setLoans(l.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => {
    const a = parseFloat(amount), r = parseFloat(interest), d = parseInt(duration);
    if (a > 0 && r >= 0 && d > 0) {
      const emi = calculateEMI(a, r, d);
      setPreview({ emi, total: emi * d, interest: emi * d - a });
    } else {
      setPreview(null);
    }
  }, [amount, interest, duration]);

  const handleCreate = async () => {
    if (!selectedUser || !amount || !duration) { toast.error("Fill all required fields"); return; }
    const user = users.find(u => u.id === selectedUser);
    if (!user) return;
    setSaving(true);
    try {
      await createLoan({
        userId: selectedUser,
        userName: user.name,
        amount: parseFloat(amount),
        interest: parseFloat(interest || "0"),
        duration: parseInt(duration),
      });
      toast.success("Loan created");
      setOpen(false);
      setSelectedUser(""); setAmount(""); setInterest(""); setDuration("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create loan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">All Loans</h2>
            <p className="text-sm text-muted-foreground">{loans.length} total loans</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="btn-new-loan">
                <Plus className="h-4 w-4 mr-1.5" /> New Loan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Borrower</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger data-testid="select-borrower"><SelectValue placeholder="Select borrower" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Principal (₹)</Label>
                    <Input type="number" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-amount" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate (%/yr)</Label>
                    <Input type="number" placeholder="12" value={interest} onChange={e => setInterest(e.target.value)} data-testid="input-interest" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (mo)</Label>
                    <Input type="number" placeholder="12" value={duration} onChange={e => setDuration(e.target.value)} data-testid="input-duration" />
                  </div>
                </div>
                {preview && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly EMI</span><span className="font-semibold text-primary">{fmt(preview.emi)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span className="font-medium">{fmt(preview.interest)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Payable</span><span className="font-semibold">{fmt(preview.total)}</span></div>
                  </div>
                )}
                <Button onClick={handleCreate} disabled={saving} className="w-full" data-testid="btn-create-loan">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Loan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {loans.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No loans yet</CardContent></Card>
          ) : loans.map(loan => (
            <Card key={loan.id} className="hover:shadow-sm transition-shadow" data-testid={`loan-${loan.id}`}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{loan.userName || "—"}</p>
                      <Badge variant={loan.status === "active" ? "default" : "secondary"} className="text-xs">
                        {loan.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmt(loan.amount)} @ {loan.interest}% · {loan.duration} mo · Started {format(new Date(loan.startDate), "dd MMM yyyy")}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{fmt(loan.paidAmount)} paid</span>
                        <span>{fmt(loan.pendingAmount)} pending</span>
                      </div>
                      <Progress value={(loan.paidAmount / loan.totalAmount) * 100} className="h-1.5" />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">{fmt(loan.emi)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                    <Link href={`/admin/loans/${loan.id}`}>
                      <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1" data-testid={`link-loan-${loan.id}`}>
                        Details <ExternalLink className="h-3 w-3" />
                      </a>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
