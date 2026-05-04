import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { SummaryCard } from "@/components/SummaryCard";
import { LoanBarChart, PaidPieChart, PaymentLineChart } from "@/components/AppCharts";
import { getAllUsers } from "@/services/userService";
import { getAllLoans } from "@/services/loanService";
import { getAllPayments } from "@/services/paymentService";
import { exportLoansCSV } from "@/services/exportService";
import { signOut } from "@/services/authService";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const c = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });
  const { data: loans = [], refetch: refetchLoans } = useQuery({
    queryKey: ["loans"],
    queryFn: getAllLoans,
  });
  const { data: payments = [], refetch: refetchPayments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: getAllPayments,
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchUsers(), refetchLoans(), refetchPayments()]);
  }, [refetchUsers, refetchLoans, refetchPayments]);

  const totalCollected = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);
  const totalLoanAmount = loans.reduce((s, l) => s + l.amount, 0);

  // Bar chart: top 5 borrowers by loan amount
  const barData = loans.slice(0, 5);
  const barLabels = barData.map((l) => (l.userName ?? "User").split(" ")[0]);
  const barValues = barData.map((l) => l.amount);

  // Line chart: last 6 months payment totals
  const now = new Date();
  const lineLabels: string[] = [];
  const lineValues: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    lineLabels.push(label);
    const total = payments
      .filter((p) => {
        const pd = new Date(p.date);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.status === "confirmed";
      })
      .reduce((s, p) => s + p.amount, 0);
    lineValues.push(total);
  }

  const pendingPayments = payments.filter((p) => p.status === "pending").length;

  const handleExport = async () => {
    setExporting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await exportLoansCSV(loans, users, payments);
    } catch {
      Alert.alert("Export Failed", "Could not export CSV.");
    }
    setExporting(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    router.replace("/login");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 90, paddingHorizontal: 20 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={c.primary} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: c.mutedForeground }]}>Admin Panel</Text>
          <Text style={[styles.name, { color: c.foreground }]}>Overview</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.themeRow}>
            <Feather name={isDark ? "moon" : "sun"} size={16} color={c.mutedForeground} />
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: c.muted, true: c.primary + "80" }}
              thumbColor={isDark ? c.primary : c.mutedForeground}
            />
          </View>
          <TouchableOpacity onPress={handleSignOut} style={[styles.signOutBtn, { backgroundColor: c.muted }]}>
            <Feather name="log-out" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.cardsRow}>
        <SummaryCard title="Borrowers" value={String(users.length)} icon="users" color={c.primary} />
        <SummaryCard title="Active Loans" value={String(loans.filter((l) => l.status === "active").length)} icon="briefcase" color={c.chart5} />
      </View>
      <View style={styles.cardsRow}>
        <SummaryCard title="Collected" value={`₹${(totalCollected / 1000).toFixed(1)}k`} icon="trending-up" color={c.success} />
        <SummaryCard title="Pending" value={`₹${(totalPending / 1000).toFixed(1)}k`} icon="clock" color={c.warning} />
      </View>

      {pendingPayments > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: c.warning + "22", borderColor: c.warning + "44" }]}
          onPress={() => router.push("/(admin)/payments")}
        >
          <Feather name="alert-circle" size={16} color={c.warning} />
          <Text style={[styles.alertText, { color: c.warning }]}>
            {pendingPayments} payment{pendingPayments > 1 ? "s" : ""} awaiting approval
          </Text>
          <Feather name="chevron-right" size={16} color={c.warning} />
        </TouchableOpacity>
      )}

      {/* Charts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Loan Distribution</Text>
        <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <LoanBarChart labels={barLabels} data={barValues} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Paid vs Pending</Text>
        <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <PaidPieChart paid={totalCollected} pending={totalPending} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Payment Trends (6 months)</Text>
        <View style={[styles.chartCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <PaymentLineChart labels={lineLabels} data={lineValues} />
        </View>
      </View>

      {/* Export */}
      <TouchableOpacity
        style={[styles.exportBtn, { backgroundColor: c.primary }, exporting && { opacity: 0.7 }]}
        onPress={handleExport}
        disabled={exporting}
        activeOpacity={0.85}
      >
        {exporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="download" size={18} color="#fff" />
            <Text style={styles.exportText}>Export Full Report (CSV)</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  name: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 24, marginTop: 4,
  },
  alertText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  chartCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    padding: 16, borderRadius: 14, marginBottom: 8,
  },
  exportText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
