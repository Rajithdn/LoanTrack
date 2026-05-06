import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import type { Loan } from "@/services/loanService";

interface LoanCardProps {
  loan: Loan;
  userName?: string;
  compact?: boolean;
  isOverdue?: boolean;
}

export function LoanCard({ loan, userName, compact, isOverdue }: LoanCardProps) {
  const c = useColors();
  const progress = loan.totalAmount > 0 ? loan.paidAmount / loan.totalAmount : 0;
  const paidMonths = Math.round(progress * loan.duration);

  return (
    <View style={[
      styles.card,
      { backgroundColor: c.card, borderColor: isOverdue ? "#EF444440" : c.border },
      isOverdue && { borderWidth: 1.5 },
    ]}>
      {/* Overdue warning strip */}
      {isOverdue && (
        <View style={styles.overdueStrip}>
          <Feather name="alert-triangle" size={12} color="#fff" />
          <Text style={styles.overdueStripText}>OVERDUE — EMI payment missed</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          {userName ? (
            <Text style={[styles.name, { color: c.foreground }]}>{userName}</Text>
          ) : null}
          <Text style={[styles.amount, { color: isOverdue ? "#EF4444" : c.foreground }]}>
            ₹{loan.amount.toLocaleString()}
          </Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            {loan.interest}% p.a. · {loan.duration} months
          </Text>
        </View>
        <View style={styles.badgeCol}>
          <StatusBadge status={loan.status} />
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>OVERDUE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: c.muted }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress * 100, 100)}%` as any,
              backgroundColor: isOverdue ? "#EF4444" : c.accent,
            },
          ]}
        />
      </View>

      {!compact && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>EMI</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>₹{loan.emi.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Paid</Text>
            <Text style={[styles.statValue, { color: c.success }]}>₹{loan.paidAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Pending</Text>
            <Text style={[styles.statValue, { color: isOverdue ? "#EF4444" : c.warning }]}>
              ₹{loan.pendingAmount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Months</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>{paidMonths}/{loan.duration}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  overdueStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 4,
  },
  overdueStripText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  badgeCol: { alignItems: "flex-end", gap: 6 },
  name: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2, opacity: 0.7 },
  amount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  overdueBadge: {
    backgroundColor: "#EF444418",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#EF444440",
  },
  overdueBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#EF4444", letterSpacing: 0.5 },
  progressBg: { height: 6, borderRadius: 100 },
  progressFill: { height: 6, borderRadius: 100 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});
