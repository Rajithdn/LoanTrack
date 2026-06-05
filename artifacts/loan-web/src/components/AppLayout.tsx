import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, CreditCard, Users, Calculator, Settings,
  FileText, Send, BarChart3, Moon, Sun, LogOut, Menu, X,
  BanknoteIcon, Bell
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Loans", href: "/admin/loans", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Payments", href: "/admin/payments", icon: <BanknoteIcon className="h-4 w-4" /> },
  { label: "Borrowers", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
  { label: "Calculator", href: "/admin/calculator", icon: <Calculator className="h-4 w-4" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
];

const borrowerNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "My Loans", href: "/loans", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Payments", href: "/payments", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Make Payment", href: "/pay", icon: <Send className="h-4 w-4" /> },
  { label: "Statement", href: "/statement", icon: <FileText className="h-4 w-4" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
  unreadCount?: number;
}

export default function AppLayout({ children, unreadCount = 0 }: AppLayoutProps) {
  const { profile } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = profile?.role === "admin" ? adminNav : borrowerNav;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin" && location === "/admin") return true;
    if (href === "/dashboard" && location === "/dashboard") return true;
    if (href !== "/admin" && href !== "/dashboard") return location.startsWith(href);
    return false;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <BanknoteIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">LoanTracker</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{profile?.role} Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              isActive(item.href)
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-sidebar-foreground/90 truncate">{profile?.name}</p>
          <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          data-testid="btn-logout"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-sidebar border-r border-sidebar-border z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-accent"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="btn-menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-foreground/80">
              {nav.find(n => isActive(n.href))?.label ?? "LoanTracker"}
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {profile?.role !== "admin" && (
              <Link href="/settings" className="relative p-2 rounded-md hover:bg-accent transition-colors" data-testid="btn-notifications">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] px-1 bg-destructive text-white">
                    {unreadCount}
                  </Badge>
                )}
              </Link>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              data-testid="btn-theme-toggle"
            >
              {theme === "dark"
                ? <Sun className="h-4 w-4 text-muted-foreground" />
                : <Moon className="h-4 w-4 text-muted-foreground" />
              }
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
