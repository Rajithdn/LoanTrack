import { useEffect, useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { getUserLoans } from "@/lib/services/loanService";
import { Loan } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function BorrowerLoans() {
  const { profile } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getUserLoans(profile.id).then(l => {
      setLoans(l.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setLoading(false);
    });
  }, [profile]);

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Loans</h2>
          <p className="text-sm text-muted-foreground">{loans.length} loan{loans.length !== 1 ? "s" : ""}</p>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">You have no loans yet. Contact your lender to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {loans.map(loan => (
              <Card key={loan.id} data-testid={`loan-${loan.id}`}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{fmt(loan.amount)}</p>
                        <Badge variant={loan.status === "active" ? "default" : "secondary"} className="text-xs">
                          {loan.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {loan.interest}% p.a. · {loan.duration} months · {fmt(loan.emi)}/mo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started {format(new Date(loan.startDate), "dd MMM yyyy")}
                      </p>
                      <div className="mt-2">
                        <Progress value={(loan.paidAmount / loan.totalAmount) * 100} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{fmt(loan.paidAmount)} paid</span>
                          <span>{fmt(loan.pendingAmount)} left</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/loans/${loan.id}`}>
                      <a data-testid={`link-loan-${loan.id}`}>
                        <Button variant="outline" size="sm" className="flex-shrink-0 gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
