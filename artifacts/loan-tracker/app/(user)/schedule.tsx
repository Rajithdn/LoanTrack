import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getLoansByUser } from "@/services/loanService";

const GREEN = "#00A86B";
const BLUE = "#0D47A1";
const AMBER = "#F5A623";
const RED = "#EF4444";

type InstallmentStatus = "paid" | "next" | "overdue" | "upcoming";

interface Installment {
  month: number;
  dueDate: Date;
  amount: number;
  status: InstallmentStatus;
}

function statusConfig(status: InstallmentStatus) {
  switch (status) {
    case "paid":     return { label: "Paid",     bg: GREEN + "18", border: GREEN + "44", text: GREEN,  icon: "check-circle"   as const };
    case "next":     return { label: "Next Due",  bg: BLUE  + "14", border: BLUE  + "44", text: BLUE,   icon: "calendar"        as const };
    case "overdue":  return { label: "Overdue",   bg: RED   + "14", border: RED   + "44", text: RED,    icon: "alert-circle"    as const };
    case "upcoming": return { label: "Upcoming",  bg: "#F1F5F9",    border: "#CBD5E1",     text: "#64748B", icon: "clock"        as const };
  }
}

export default function RepaymentSchedule() {
  const c = useColors();
  const { user } = useAuth();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["userLoans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  const loan = loans[0];

  const schedule = useMemo<Installment[]>(() => {
    if (!loan) return [];
    const start = new Date(loan.startDate);
    const progress = loan.totalAmount > 0 ? loan.paidAmount / loan.totalAmount : 0;
    const paidMonths = Math.round(progress * loan.duration);
    const now = new Date();

    return Array.from({ length: loan.duration }, (_, i) => {
      const month = i + 1;
      const dueDate = new Date(start.getFullYear(), start.getMonth() + month, start.getDate());
      let status: InstallmentStatus;
      if (month <= paidMonths) {
        status = "paid";
      } else if (month === paidMonths + 1) {
        status = dueDate < now ? "overdue" : "next";
      } else {
        status = dueDate < now ? "overdue" : "upcoming";
      }
      return { month, dueDate, amount: loan.emi, status };
    });
  }, [loan]);

  const paidCount   = schedule.filter((s) => s.status === "paid").length;
  const overdueCount = schedule.filter((s) => s.status === "overdue").length;
  const remainingCount = schedule.filter((s) => s.status === "upcoming" || s.status === "next").length;
  const progress = schedule.length > 0 ? paidCount / schedule.length : 0;

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: GREEN }]}>
      {/* Green header */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <SafeAreaView edges={["top"]} style={styles.headerInner}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Repayment Schedule</Text>
            <View style={{ width: 38 }} />
          </View>

          {loan && (
            <View style={styles.loanSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Principal</Text>
                <Text style={styles.summaryValue}>₹{loan.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>EMI / Month</Text>
                <Text style={styles.summaryValue}>₹{loan.emi.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{loan.duration} mo</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* White body */}
      <View style={[styles.body, { backgroundColor: c.background }]}>
        {!loan ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={c.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>No Active Loan</Text>
            <Text style={[styles.emptySub, { color: c.mutedForeground }]}>Contact your admin to set up a loan.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Progress overview */}
            <View style={[styles.overviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.overviewRow}>
                <View style={styles.overviewStat}>
                  <Text style={[styles.overviewVal, { color: GREEN }]}>{paidCount}</Text>
                  <Text style={[styles.overviewLabel, { color: c.mutedForeground }]}>Paid</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Text style={[styles.overviewVal, { color: RED }]}>{overdueCount}</Text>
                  <Text style={[styles.overviewLabel, { color: c.mutedForeground }]}>Overdue</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Text style={[styles.overviewVal, { color: BLUE }]}>{remainingCount}</Text>
                  <Text style={[styles.overviewLabel, { color: c.mutedForeground }]}>Remaining</Text>
                </View>
                <View style={styles.overviewStat}>
                  <Text style={[styles.overviewVal, { color: c.foreground }]}>{schedule.length}</Text>
                  <Text style={[styles.overviewLabel, { color: c.mutedForeground }]}>Total</Text>
                </View>
              </View>
              <View style={[styles.progressBg, { backgroundColor: c.muted }]}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
              </View>
              <Text style={[styles.progressText, { color: c.mutedForeground }]}>
                {Math.round(progress * 100)}% complete · ₹{loan.paidAmount.toLocaleString()} of ₹{loan.totalAmount.toLocaleString()}
              </Text>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {(["paid", "next", "overdue", "upcoming"] as InstallmentStatus[]).map((s) => {
                const cfg = statusConfig(s);
                return (
                  <View key={s} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: cfg.text }]} />
                    <Text style={[styles.legendLabel, { color: c.mutedForeground }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Installment list */}
            {schedule.map((item) => {
              const cfg = statusConfig(item.status);
              const isNext = item.status === "next";
              return (
                <View
                  key={item.month}
                  style={[
                    styles.installmentRow,
                    { backgroundColor: cfg.bg, borderColor: cfg.border },
                    isNext && styles.nextHighlight,
                  ]}
                >
                  {/* Month number circle */}
                  <View style={[styles.monthCircle, { backgroundColor: cfg.text + "22", borderColor: cfg.text + "55" }]}>
                    <Text style={[styles.monthNum, { color: cfg.text }]}>{item.month}</Text>
                  </View>

                  {/* Date + label */}
                  <View style={styles.installmentInfo}>
                    <Text style={[styles.installmentDate, { color: c.foreground }]}>
                      {item.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                    <Text style={[styles.installmentSub, { color: c.mutedForeground }]}>
                      Month {item.month} of {schedule.length}
                    </Text>
                  </View>

                  {/* Amount */}
                  <View style={styles.installmentRight}>
                    <Text style={[styles.installmentAmount, { color: cfg.text }]}>
                      ₹{item.amount.toLocaleString()}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: cfg.text + "22" }]}>
                      <Feather name={cfg.icon} size={10} color={cfg.text} />
                      <Text style={[styles.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Completion note */}
            {loan.status === "completed" && (
              <View style={[styles.completedBanner, { backgroundColor: GREEN + "18", borderColor: GREEN + "44" }]}>
                <Feather name="award" size={20} color={GREEN} />
                <Text style={[styles.completedText, { color: GREEN }]}>
                  Congratulations! Loan fully repaid.
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Header
  header: {
    backgroundColor: GREEN, paddingBottom: 28, overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)", top: -60, right: -50,
  },
  circle2: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.07)", bottom: -30, left: 20,
  },
  headerInner: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  loanSummary: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, padding: 16, marginTop: 4,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.3)" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  summaryValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  // Body
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", marginTop: -20 },
  scrollContent: { padding: 16 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  // Overview
  overviewCard: {
    borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  overviewRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  overviewStat: { alignItems: "center", flex: 1 },
  overviewVal: { fontSize: 24, fontFamily: "Inter_700Bold" },
  overviewLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  progressBg: { height: 8, borderRadius: 100, marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 100, backgroundColor: GREEN },
  progressText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  // Legend
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Installments
  installmentRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  nextHighlight: {
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  monthCircle: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  monthNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  installmentInfo: { flex: 1 },
  installmentDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  installmentSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  installmentRight: { alignItems: "flex-end", gap: 4 },
  installmentAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  // Completed banner
  completedBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8,
  },
  completedText: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
});
