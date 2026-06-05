import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getUserLoans } from "@/lib/services/loanService";
import { submitPayment } from "@/lib/services/paymentService";
import { Loan } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const MODES = ["PhonePe", "Google Pay", "Cash", "Bank Transfer"] as const;
const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const schema = z.object({
  loanId: z.string().min(1, "Select a loan"),
  amount: z.string().min(1, "Enter amount").refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Invalid amount"),
  paymentMode: z.enum(MODES),
});
type FormData = z.infer<typeof schema>;

export default function BorrowerPay() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMode: "Cash" },
  });

  const selectedLoanId = watch("loanId");
  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  useEffect(() => {
    if (!profile) return;
    getUserLoans(profile.id)
      .then(l => {
        setLoans(l.filter(ln => ln.status === "active"));
        setLoading(false);
      });
  }, [profile]);

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    try {
      await submitPayment({
        loanId: data.loanId,
        userId: profile.id,
        amount: parseFloat(data.amount),
        paymentMode: data.paymentMode,
      });
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || "Payment submission failed");
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    </AppLayout>
  );

  if (submitted) return (
    <AppLayout>
      <div className="p-6 flex flex-col items-center text-center gap-4 max-w-sm mx-auto pt-16">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Payment Submitted</h3>
        <p className="text-sm text-muted-foreground">
          Your payment is pending admin approval. You'll be notified once it's confirmed.
        </p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="btn-pay-again">Pay Again</Button>
          <Button onClick={() => setLocation("/payments")} data-testid="btn-view-history">View History</Button>
        </div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-md">
        <div>
          <h2 className="text-xl font-bold text-foreground">Make Payment</h2>
          <p className="text-sm text-muted-foreground">Submit a payment for admin approval</p>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No active loans to pay against.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5 pb-5">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Select Loan</Label>
                  <Select onValueChange={v => setValue("loanId", v)}>
                    <SelectTrigger data-testid="select-loan"><SelectValue placeholder="Choose a loan" /></SelectTrigger>
                    <SelectContent>
                      {loans.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {fmt(l.amount)} loan · {fmt(l.pendingAmount)} pending
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.loanId && <p className="text-xs text-destructive">{errors.loanId.message}</p>}
                </div>

                {selectedLoan && (
                  <div className="bg-muted rounded-lg px-3 py-2.5 text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between"><span>Monthly EMI</span><span className="font-medium text-foreground">{fmt(selectedLoan.emi)}</span></div>
                    <div className="flex justify-between"><span>Remaining</span><span className="font-medium text-foreground">{fmt(selectedLoan.pendingAmount)}</span></div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder={selectedLoan ? String(Math.round(selectedLoan.emi)) : "Enter amount"}
                    data-testid="input-amount"
                    {...register("amount")}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select defaultValue="Cash" onValueChange={v => setValue("paymentMode", v as typeof MODES[number])}>
                    <SelectTrigger data-testid="select-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="btn-submit-payment">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Payment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
