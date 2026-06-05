import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Phone, Mail } from "lucide-react";

export default function BorrowerSettings() {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-md">
        <h2 className="text-xl font-bold text-foreground">Settings</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{profile?.name}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />{profile?.email}
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />{profile.phone}
                  </div>
                )}
                <Badge variant="secondary" className="text-xs capitalize mt-1">{profile?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="dark-mode">Dark mode</Label>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={checked => setTheme(checked ? "dark" : "light")}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
