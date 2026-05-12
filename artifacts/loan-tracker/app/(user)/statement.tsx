import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getLoansByUser } from "@/services/loanService";
import { getPaymentsByUser } from "@/services/paymentService";
import { getAllUsers } from "@/services/userService";
import { downloadLoanStatement } from "@/services/statementService";
import { useQuery } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NotificationBanner } from "@/components/NotificationBanner";

const GREEN = "#00A86B";

export default function StatementScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["userLoans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["userPayments", user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
    enabled: !!user,
  });

  const borrowerProfile = allUsers.find((u) => u.id === user?.id) ?? null;
  const isLoading = loansLoading || paymentsLoading;

  const handleDownload = async (loanId: string) => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan || !borrowerProfile) {
      setNotification({ msg: "Could not load loan data. Please try again.", type: "error" });
      return;
    }
    const loanPayments = payments.filter((p) => p.loanId === loanId);
    setLoadingId(loanId);
    try {
      await downloadLoanStatement(loan, borrowerProfile, loanPayments);
      setNotification({ msg: "Statement ready! Save or share it.", type: "success" });
    } catch (e: any) {
      setNotification({ msg: e?.message ?? "Failed to generate statement.", type: "error" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: GREEN }]}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {notification && (
        <NotificationBanner
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}

      <ScreenHeader
        title="Loan Statement"
        subtitle="Download your full PDF statement"
      />

      <View style={[styles.body, { backgroundColor: c.background }]}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 60 }} color={c.primary} size="large" />
        ) : loans.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={c.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>No loans yet</Text>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
              Your loan statements will appear here once an admin assigns you a loan.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Info banner */}
            <View style={[styles.infoBanner, { backgroundColor: c.primary + "12", borderColor: c.primary + "30" }]}>
              <Feather name="info" size={15} color={c.primary} />
              <Text style={[styles.infoText, { color: c.primary }]}>
                Each statement includes your loan details, full payment history, and complete EMI schedule as a PDF.
              </Text>
            </View>

            {/* Loan cards */}
            {loans.map((loan) => {
              const loanPayments = payments.filter((p) => p.loanId === loan.id);
              const confirmedCount = loanPayments.filter((p) => p.status === "confirmed").length;
              const progress = Math.min(100, Math.round((loan.paidAmount / loan.totalAmount) * 100));
              const isGenerating = loadingId === loan.id;

              return (
                <View
                  key={loan.id}
                  style={[styles.loanCard, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  {/* Card header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: c.primary + "15" }]}>
                      <Feather name="file-text" size={20} color={c.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: c.foreground }]}>
                        Loan Statement
                      </Text>
                      <Text style={[styles.cardSub, { color: c.mutedForeground }]}>
                        Started {new Date(loan.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: loan.status === "completed" ? "#3B82F615" : GREEN + "15" }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: loan.status === "completed" ? "#3B82F6" : GREEN }
                      ]}>
                        {loan.status === "completed" ? "Completed" : "Active"}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={[styles.statsRow, { borderColor: c.border }]}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Loan</Text>
                      <Text style={[styles.statValue, { color: c.foreground }]}>
                        ₹{loan.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Paid</Text>
                      <Text style={[styles.statValue, { color: GREEN }]}>
                        ₹{loan.paidAmount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Left</Text>
                      <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                        ₹{loan.pendingAmount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: c.mutedForeground }]}>
                        {confirmedCount} payment{confirmedCount !== 1 ? "s" : ""} confirmed
                      </Text>
                      <Text style={[styles.progressPct, { color: c.primary }]}>{progress}%</Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: c.muted }]}>
                      <View
                        style={[styles.progressFill, { width: `${progress}%` as any }]}
                      />
                    </View>
                  </View>

                  {/* What's included */}
                  <View style={styles.includesList}>
                    {[
                      "Loan details & interest breakdown",
                      `All ${confirmedCount} confirmed payment(s)`,
                      `Full ${loan.duration}-month EMI schedule`,
                    ].map((item) => (
                      <View key={item} style={styles.includeItem}>
                        <Feather name="check" size={12} color={GREEN} />
                        <Text style={[styles.includeText, { color: c.mutedForeground }]}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Download button */}
                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      { backgroundColor: isGenerating ? c.muted : c.primary },
                    ]}
                    onPress={() => handleDownload(loan.id)}
                    disabled={isGenerating}
                    activeOpacity={0.85}
                  >
                    {isGenerating ? (
                      <>
                        <ActivityIndicator size="small" color={c.mutedForeground} />
                        <Text style={[styles.downloadBtnText, { color: c.mutedForeground }]}>
                          Generating PDF…
                        </Text>
                      </>
                    ) : (
                      <>
                        <Feather name="download" size={16} color="#fff" />
                        <Text style={[styles.downloadBtnText, { color: "#fff" }]}>
                          Download Statement PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  loanCard: {
    borderRadius: 18, borderWidth: 1,
    marginBottom: 20, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 18, paddingBottom: 14,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow: {
    flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statDivider: { width: 1 },
  progressSection: { padding: 16, paddingBottom: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  includesList: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  includeItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  includeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  downloadBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, margin: 16, marginTop: 4,
    paddingVertical: 14, borderRadius: 14,
  },
  downloadBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
