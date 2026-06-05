import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanknoteIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@07";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleProfile = async (uid: string, email: string) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const profile = snap.data();
      return profile.role === "admin" ? "/admin" : "/dashboard";
    }
    if (email === ADMIN_EMAIL) {
      const profile = { id: uid, name: "Administrator", email, role: "admin" };
      await setDoc(doc(db, "users", uid), profile);
      await setDoc(doc(db, "config", "admins"), { ids: arrayUnion(uid) }, { merge: true });
      return "/admin";
    }
    const profile = { id: uid, name: email.split("@")[0], email, role: "user" };
    await setDoc(doc(db, "users", uid), profile);
    return "/dashboard";
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      let uid: string;
      if (data.email.toLowerCase() === ADMIN_EMAIL && data.password === ADMIN_PASSWORD) {
        try {
          const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
          uid = cred.user.uid;
        } catch {
          const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
          uid = cred.user.uid;
        }
      } else {
        const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
        uid = cred.user.uid;
      }
      const redirect = await handleProfile(uid, data.email);
      setLocation(redirect);
    } catch (e: any) {
      const code = e?.code ?? "";
      if (code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("wrong-password")) {
        toast.error("Invalid email or password");
      } else if (code.includes("too-many-requests")) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error(e.message || "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (e: any) {
        if (e?.code?.includes("popup-blocked")) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw e;
      }
      const user = result.user;
      let profile = await getDoc(doc(db, "users", user.uid));
      if (!profile.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          name: user.displayName ?? user.email?.split("@")[0],
          email: user.email,
          phone: user.phoneNumber ?? "",
          role: "user",
        });
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.data()?.role;
      setLocation(role === "admin" ? "/admin" : "/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Google sign in failed");
    } finally {
      setGoogleLoading(false);
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
          <p className="text-sm text-muted-foreground mt-1">Private lending management</p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  data-testid="input-email"
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  data-testid="input-password"
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="btn-signin">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={googleLoading}
              data-testid="btn-google"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              No account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
