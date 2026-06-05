import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanknoteIcon, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email.trim());
      setSent(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <BanknoteIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">LoanTracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Forgot password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center text-center py-4 gap-3">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium text-foreground">Reset email sent</p>
                <p className="text-xs text-muted-foreground">Check your inbox and follow the link to reset your password.</p>
                <Link href="/login">
                  <a className="text-sm text-primary hover:underline font-medium mt-2">Back to sign in</a>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    data-testid="input-email"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="btn-reset">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send reset link
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  <Link href="/login">
                    <a className="text-primary hover:underline font-medium">Back to sign in</a>
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
