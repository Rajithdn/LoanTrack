import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getUsers, createBorrower } from "@/lib/services/userService";
import { getLoans } from "@/lib/services/loanService";
import { UserProfile, Loan } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Loader2, Phone, Mail, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Min 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "Password@123" },
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [u, l] = await Promise.all([getUsers(), getLoans()]);
    setUsers(u);
    setLoans(l);
    setLoading(false);
  };

  const getUserLoans = (userId: string) => loans.filter(l => l.userId === userId);

  const getUserStats = (userId: string) => {
    const ul = getUserLoans(userId);
    const totalBorrowed = ul.reduce((s, l) => s + l.amount, 0);
    const totalPaid = ul.reduce((s, l) => s + l.paidAmount, 0);
    const totalPending = ul.reduce((s, l) => s + l.pendingAmount, 0);
    return { totalBorrowed, totalPaid, totalPending, loanCount: ul.length };
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await createBorrower(data);
      toast.success("Borrower added successfully");
      setOpen(false);
      reset({ password: "Password@123" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add borrower");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Borrowers</h2>
            <p className="text-sm text-muted-foreground">{users.length} registered borrowers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="btn-add-borrower">
                <Plus className="h-4 w-4 mr-1.5" /> Add Borrower
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Borrower</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" data-testid="input-name" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="john@example.com" data-testid="input-email" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Phone (optional)</Label>
                  <Input type="tel" placeholder="+91 98765 43210" data-testid="input-phone" {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="text" data-testid="input-password" {...register("password")} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  <p className="text-xs text-muted-foreground">Share this with the borrower so they can log in</p>
                </div>
                <Button type="submit" className="w-full" disabled={saving} data-testid="btn-save-borrower">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Borrower
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3">
          {users.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No borrowers yet</CardContent></Card>
          ) : users.map(user => {
            const stats = getUserStats(user.id);
            const progress = stats.totalBorrowed > 0 ? (stats.totalPaid / (stats.totalBorrowed)) * 100 : 0;
            return (
              <Card
                key={user.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setSelectedUser(user)}
                data-testid={`user-${user.id}`}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{stats.loanCount} loan{stats.loanCount !== 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {stats.totalBorrowed > 0 && (
                        <div className="mt-1.5">
                          <Progress value={progress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-0.5">{fmt(stats.totalPaid)} of {fmt(stats.totalBorrowed)} repaid</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Borrower Profile</DialogTitle>
            </DialogHeader>
            {selectedUser && (() => {
              const stats = getUserStats(selectedUser.id);
              const ul = getUserLoans(selectedUser.id);
              return (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {selectedUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{selectedUser.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" />{selectedUser.email}
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />{selectedUser.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Total Borrowed", value: fmt(stats.totalBorrowed) },
                      { label: "Total Paid", value: fmt(stats.totalPaid) },
                      { label: "Pending", value: fmt(stats.totalPending) },
                    ].map(s => (
                      <div key={s.label} className="bg-muted rounded-lg p-2.5 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {ul.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Loans</p>
                      <div className="space-y-2">
                        {ul.map(l => (
                          <div key={l.id} className="bg-muted/50 rounded-lg p-2.5" data-testid={`user-loan-${l.id}`}>
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{fmt(l.amount)} @ {l.interest}%</span>
                              <span className={l.status === "active" ? "text-primary" : "text-muted-foreground"}>{l.status}</span>
                            </div>
                            <Progress value={(l.paidAmount / l.totalAmount) * 100} className="h-1 mt-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
