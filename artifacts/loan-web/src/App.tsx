import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLoans from "@/pages/admin/AdminLoans";
import AdminLoanDetail from "@/pages/admin/AdminLoanDetail";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminCalculator from "@/pages/admin/AdminCalculator";
import AdminSettings from "@/pages/admin/AdminSettings";

import BorrowerDashboard from "@/pages/borrower/BorrowerDashboard";
import BorrowerLoans from "@/pages/borrower/BorrowerLoans";
import BorrowerLoanDetail from "@/pages/borrower/BorrowerLoanDetail";
import BorrowerPayments from "@/pages/borrower/BorrowerPayments";
import BorrowerPay from "@/pages/borrower/BorrowerPay";
import BorrowerStatement from "@/pages/borrower/BorrowerStatement";
import BorrowerSettings from "@/pages/borrower/BorrowerSettings";

import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (profile?.role === "admin") return <Redirect to="/admin" />;
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      <Route path="/admin">
        {() => <AdminRoute><AdminDashboard /></AdminRoute>}
      </Route>
      <Route path="/admin/loans">
        {() => <AdminRoute><AdminLoans /></AdminRoute>}
      </Route>
      <Route path="/admin/loans/:id">
        {(params) => <AdminRoute><AdminLoanDetail loanId={params.id} /></AdminRoute>}
      </Route>
      <Route path="/admin/payments">
        {() => <AdminRoute><AdminPayments /></AdminRoute>}
      </Route>
      <Route path="/admin/users">
        {() => <AdminRoute><AdminUsers /></AdminRoute>}
      </Route>
      <Route path="/admin/calculator">
        {() => <AdminRoute><AdminCalculator /></AdminRoute>}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminRoute><AdminSettings /></AdminRoute>}
      </Route>

      <Route path="/dashboard">
        {() => <ProtectedRoute><BorrowerDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/loans">
        {() => <ProtectedRoute><BorrowerLoans /></ProtectedRoute>}
      </Route>
      <Route path="/loans/:id">
        {(params) => <ProtectedRoute><BorrowerLoanDetail loanId={params.id} /></ProtectedRoute>}
      </Route>
      <Route path="/payments">
        {() => <ProtectedRoute><BorrowerPayments /></ProtectedRoute>}
      </Route>
      <Route path="/pay">
        {() => <ProtectedRoute><BorrowerPay /></ProtectedRoute>}
      </Route>
      <Route path="/statement">
        {() => <ProtectedRoute><BorrowerStatement /></ProtectedRoute>}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute><BorrowerSettings /></ProtectedRoute>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
