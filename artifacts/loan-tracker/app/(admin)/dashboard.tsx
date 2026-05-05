import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { LoanBarChart, PaidPieChart, PaymentLineChart } from "@/components/AppCharts";
import { getAllUsers } from "@/services/userService";
import { getAllLoans } from "@/services/loanService";
import { getAllPayments } from "@/services/paymentService";
import { exportLoansCSV } from "@/services/exportService";
import { signOut } from "@/services/authService";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

const GREEN = "#00A86B";
const GREEN_DARK = "#007A4D";

export default function AdminDashboard() {
  const c = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);

  const { data: users = [], refetch: refetchUsers } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });
  const { data: loans = [], refetch: refetchLoans } = useQuery({ queryKey: ["loans"], queryFn: getAllLoans });
  const { data: payments = [], refetch: refetchPayments, isLoading } = useQuery({ queryKey: ["payments"], queryFn: getAllPayments });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchUsers(), refetchLoans(), refetchPayments()]);
  }, [refetchUsers, refetchLoans, refetchPayments]);

  const totalCollected  = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending    = loans.reduce((s, l) => s + l.pendingAmount, 0);
  const totalLoanAmount = loans.reduce((s, l) => s + l.amount, 0);
  const totalInterest   = loans.reduce((s, l) => s + (l.interestAmount ?? 0), 0);

  const barData   = loans.slice(0, 5);
  const barLabels = barData.map((l) => (l.userName ?? "User").split(" ")[0]);
  const barValues = barData.map((l) => l.amount);

  const now = new Date();
  const lineLabels: string[] = [];
  const lineValues: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    lineLabels.push(d.toLocaleDateString("en-US", { month: "short" }));
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

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={GREEN} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: GREEN }]}>
      {/* Green gradient header */}
      <View style={styles.headerBg}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <StatusBar barStyle="light-content" backgroundColor={GREEN} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Admin Panel</Text>
              <Text style={styles.name}>Overview</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.themeRow}>
                <Feather name={isDark ? "moon" : "sun"} size={16} color="rgba(255,255,255,0.8)" />
                <Switch
                  value={isDark} onValueChange={toggleTheme}
                  trackColor={{ false: "rgba(255,255,255,0.3)", true: "rgba(255,255,255,0.5)" }}
                  thumbColor="#fff"
                />
              </View>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                <Feather name="log-out" size={16} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline quick stats on header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{users.length}</Text>
              <Text style={styles.headerStatLabel}>Borrowers</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{loans.filter((l) => l.status === "active").length}</Text>
              <Text style={styles.headerStatLabel}>Active Loans</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>₹{(totalCollected / 1000).toFixed(1)}k</Text>
              <Text style={styles.headerStatLabel}>Collected</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>₹{(totalPending / 1000).toFixed(1)}k</Text>
              <Text style={styles.headerStatLabel}>Pending</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* White body */}
      <ScrollView
        style={[styles.body, { backgroundColor: c.background }]}
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad + 24 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Loan + Interest — full-width stacked cards */}
        <View style={styles.wideRow}>
          <View style={[styles.wideCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.wideCardIcon, { backgroundColor: GREEN + "18" }]}>
              <Feather name="credit-card" size={20} color={GREEN} />
            </View>
            <View style={styles.wideCardText}>
              <Text style={[styles.wideCardLabel, { color: c.mutedForeground }]}>Total Loan Disbursed</Text>
              <Text style={[styles.wideCardVal, { color: c.foreground }]}>₹{totalLoanAmount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={[styles.wideCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.wideCardIcon, { backgroundColor: "#F5A62320" }]}>
              <Feather name="percent" size={20} color="#F5A623" />
            </View>
            <View style={styles.wideCardText}>
              <Text style={[styles.wideCardLabel, { color: c.mutedForeground }]}>Total Interest Earned</Text>
              <Text style={[styles.wideCardVal, { color: "#F5A623" }]}>₹{totalInterest.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Pending payments alert */}
        {pendingPayments > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: "#F5A62322", borderColor: "#F5A62344" }]}
            onPress={() => router.push("/(admin)/payments")}
          >
            <Feather name="alert-circle" size={16} color="#F5A623" />
            <Text style={[styles.alertText, { color: "#F5A623" }]}>
              {pendingPayments} payment{pendingPayments > 1 ? "s" : ""} awaiting approval
            </Text>
            <Feather name="chevron-right" size={16} color="#F5A623" />
          </TouchableOpacity>
        )}

        {/* Quick nav row */}
        <View style={styles.quickNav}>
          {[
            { label: "Loans",      icon: "briefcase",  route: "/(admin)/loans"      },
            { label: "Users",      icon: "users",       route: "/(admin)/users"      },
            { label: "Payments",   icon: "credit-card", route: "/(admin)/payments"   },
            { label: "Calculator", icon: "calculator",  route: "/(admin)/calculator" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.quickNavCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickNavIcon, { backgroundColor: GREEN + "18" }]}>
                <Feather name={item.icon as any} size={20} color={GREEN} />
              </View>
              <Text style={[styles.quickNavLabel, { color: c.foreground }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
          style={[styles.exportBtn, exporting && { opacity: 0.7 }, { marginTop: 24, marginBottom: 8 }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Header
  headerBg: { backgroundColor: GREEN, paddingBottom: 28, overflow: "hidden" },
  circle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)", top: -60, right: -60,
  },
  circle2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)", bottom: -30, left: 10,
  },
  headerContent: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 12,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  signOutBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  headerStats: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14,
    padding: 14, marginTop: 4,
  },
  headerStat: { flex: 1, alignItems: "center" },
  headerStatVal: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  headerStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  headerStatDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.25)" },
  // Body
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  container: { padding: 16 },
  // Wide cards — stack vertically, full width
  wideRow: { gap: 10, marginBottom: 16 },
  wideCard: {
    width: "100%",
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 14, padding: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  wideCardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  wideCardText: { flex: 1 },
  wideCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  wideCardVal: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 2 },
  // Alert
  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  alertText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  // Quick nav
  quickNav: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickNavCard: {
    flex: 1, alignItems: "center", gap: 8, borderRadius: 14,
    padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  quickNavIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickNavLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  chartCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  // Export
  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 14, backgroundColor: GREEN,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  exportText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
