import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { calculateEMI } from "@/lib/services/loanService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";
import { addMonths, format } from "date-fns";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function AdminCalculator() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("12");
  const [duration, setDuration] = useState("12");

  const p = parseFloat(principal) || 0;
  const r = parseFloat(rate) || 0;
  const d = parseInt(duration) || 0;

  const emi = p > 0 && d > 0 ? calculateEMI(p, r, d) : 0;
  const totalPayable = emi * d;
  const totalInterest = totalPayable - p;

  const schedule = d > 0 && emi > 0 ? Array.from({ length: d }, (_, i) => {
    const monthRate = r / 100 / 12;
    const openingBalance = i === 0 ? p : 0;
    let balance = p;
    for (let j = 0; j < i; j++) {
      const interestPart = balance * monthRate;
      const principalPart = emi - interestPart;
      balance -= principalPart;
    }
    const interestPart = balance * monthRate;
    const principalPart = Math.min(emi - interestPart, balance);
    const closingBalance = Math.max(0, balance - principalPart);
    return {
      month: i + 1,
      date: format(addMonths(new Date(), i), "MMM yyyy"),
      emi,
      interest: interestPart,
      principal: principalPart,
      balance: closingBalance,
    };
  }) : [];

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">EMI Calculator</h2>
        </div>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Principal Amount (₹)</Label>
                <Input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} data-testid="input-principal" />
              </div>
              <div className="space-y-1.5">
                <Label>Annual Interest Rate (%)</Label>
                <Input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} data-testid="input-rate" />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (months)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} data-testid="input-duration" />
              </div>
            </div>

            {emi > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="bg-primary/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Monthly EMI</p>
                  <p className="text-2xl font-bold text-primary mt-1" data-testid="text-emi">{fmt(emi)}</p>
                </div>
                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Total Interest</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-total-interest">{fmt(totalInterest)}</p>
                </div>
                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">Total Payable</p>
                  <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-total-payable">{fmt(totalPayable)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {schedule.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">EMI</TableHead>
                      <TableHead className="text-xs text-right">Principal</TableHead>
                      <TableHead className="text-xs text-right">Interest</TableHead>
                      <TableHead className="text-xs text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map(row => (
                      <TableRow key={row.month} data-testid={`schedule-row-${row.month}`}>
                        <TableCell className="text-xs">{row.month}</TableCell>
                        <TableCell className="text-xs">{row.date}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{fmt(row.emi)}</TableCell>
                        <TableCell className="text-xs text-right text-primary">{fmt(row.principal)}</TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">{fmt(row.interest)}</TableCell>
                        <TableCell className="text-xs text-right">{fmt(row.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
