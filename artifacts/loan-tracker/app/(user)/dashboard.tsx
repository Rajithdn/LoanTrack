import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getLoansByUser } from "@/services/loanService";
import { submitPayment } from "@/services/paymentService";
import { signOut } from "@/services/authService";
import { NotificationBanner } from "@/components/NotificationBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function UserDashboard() {
  const c = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState("");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ["userLoans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  const loan = loans[0]; // Primary loan

  const payMutation = useMutation({
    mutationFn: ({ loanId, amount }: { loanId: string; amount: number }) =>
      submitPayment(loanId, user!.id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userPayments", user?.id] });
      setPayModal(false);
      setPayAmount("");
      setNotification({ msg: "Payment submitted! Awaiting admin confirmation.", type: "info" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => setPayError("Failed to submit payment. Try again."),
  });

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) { setPayError("Enter a valid amount"); return; }
    if (!loan) return;
    setPayError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    payMutation.mutate({ loanId: loan.id, amount });
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    router.replace("/login");
  };

  const progress = loan ? (loan.paidAmount / loan.totalAmount) : 0;
  const paidMonths = loan ? Math.round(progress * loan.duration) : 0;
  const remainingMonths = loan ? loan.duration - paidMonths : 0;

  // Next due date
  const nextDue = loan ? (() => {
    const start = new Date(loan.startDate);
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + paidMonths + 1, start.getDate());
    return nextMonth.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  })() : null;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {notification && (
        <NotificationBanner
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
          duration={4000}
        />
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 90, paddingHorizontal: 20 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: c.mutedForeground }]}>Welcome back</Text>
            <Text style={[styles.name, { color: c.foreground }]}>{user?.name?.split(" ")[0]}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.themeRow}>
              <Feather name={isDark ? "moon" : "sun"} size={15} color={c.mutedForeground} />
              <Switch value={isDark} onValueChange={toggleTheme}
                trackColor={{ false: c.muted, true: c.primary + "80" }}
                thumbColor={isDark ? c.primary : c.mutedForeground}
              />
            </View>
            <TouchableOpacity onPress={handleSignOut} style={[styles.signOutBtn, { backgroundColor: c.muted }]}>
              <Feather name="log-out" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {!loan ? (
          <View style={[styles.noLoanCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="inbox" size={44} color={c.mutedForeground} />
            <Text style={[styles.noLoanTitle, { color: c.foreground }]}>No Active Loan</Text>
            <Text style={[styles.noLoanSub, { color: c.mutedForeground }]}>Contact your admin to set up a loan.</Text>
          </View>
        ) : (
          <>
            {/* Loan Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Loan Amount</Text>
                  <Text style={styles.heroAmount}>₹{loan.amount.toLocaleString()}</Text>
                </View>
                <StatusBadge status={loan.status} size="md" />
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Interest</Text>
                  <Text style={styles.heroStatValue}>{loan.interest}% p.a.</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>EMI</Text>
                  <Text style={styles.heroStatValue}>₹{loan.emi.toLocaleString()}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Duration</Text>
                  <Text style={styles.heroStatValue}>{loan.duration} months</Text>
                </View>
              </View>
            </View>

            {/* Progress */}
            <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: c.foreground }]}>Repayment Progress</Text>
                <Text style={[styles.progressPercent, { color: c.primary }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: c.muted }]}>
                <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: c.accent }]} />
              </View>
              <View style={styles.progressStats}>
                <View style={styles.pStat}>
                  <Text style={[styles.pStatVal, { color: c.success }]}>₹{loan.paidAmount.toLocaleString()}</Text>
                  <Text style={[styles.pStatLabel, { color: c.mutedForeground }]}>Paid</Text>
                </View>
                <View style={styles.pStat}>
                  <Text style={[styles.pStatVal, { color: c.warning }]}>₹{loan.pendingAmount.toLocaleString()}</Text>
                  <Text style={[styles.pStatLabel, { color: c.mutedForeground }]}>Remaining</Text>
                </View>
                <View style={styles.pStat}>
                  <Text style={[styles.pStatVal, { color: c.foreground }]}>{paidMonths}/{loan.duration}</Text>
                  <Text style={[styles.pStatLabel, { color: c.mutedForeground }]}>Months</Text>
                </View>
              </View>
            </View>

            {/* Info Row */}
            <View style={styles.infoRow}>
              <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Feather name="calendar" size={18} color={c.primary} />
                <Text style={[styles.infoLabel, { color: c.mutedForeground }]}>Next Due</Text>
                <Text style={[styles.infoValue, { color: c.foreground }]}>{nextDue}</Text>
              </View>
              <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Feather name="clock" size={18} color={c.warning} />
                <Text style={[styles.infoLabel, { color: c.mutedForeground }]}>Remaining</Text>
                <Text style={[styles.infoValue, { color: c.foreground }]}>{remainingMonths} months</Text>
              </View>
            </View>

            {/* Pay EMI Button */}
            {loan.status === "active" && (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: c.accent }]}
                onPress={() => { setPayModal(true); setPayAmount(String(loan.emi)); setPayError(""); }}
                activeOpacity={0.85}
              >
                <Feather name="credit-card" size={20} color="#fff" />
                <Text style={styles.payBtnText}>Pay EMI</Text>
              </TouchableOpacity>
            )}

            {loan.status === "completed" && (
              <View style={[styles.completedBanner, { backgroundColor: c.success + "22" }]}>
                <Feather name="check-circle" size={20} color={c.success} />
                <Text style={[styles.completedText, { color: c.success }]}>Loan fully repaid! Congratulations.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pay Modal */}
      <Modal visible={payModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPayModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Submit Payment</Text>
            <TouchableOpacity onPress={() => setPayModal(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {loan && (
              <View style={[styles.emiHint, { backgroundColor: c.muted }]}>
                <Text style={[styles.emiHintText, { color: c.mutedForeground }]}>Monthly EMI: </Text>
                <Text style={[styles.emiHintVal, { color: c.foreground }]}>₹{loan.emi.toLocaleString()}</Text>
              </View>
            )}
            {payError ? <Text style={[styles.formError, { color: c.destructive }]}>{payError}</Text> : null}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Payment Amount (₹)</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="decimal-pad"
                  placeholder="Enter amount"
                  placeholderTextColor={c.mutedForeground}
                />
              </View>
            </View>
            <View style={[styles.noteBox, { backgroundColor: c.warning + "18" }]}>
              <Feather name="info" size={14} color={c.warning} />
              <Text style={[styles.noteText, { color: c.warning }]}>
                Payment will be marked as pending until confirmed by admin.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.accent }, payMutation.isPending && { opacity: 0.7 }]}
              onPress={handlePay}
              disabled={payMutation.isPending}
              activeOpacity={0.85}
            >
              {payMutation.isPending ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Submit Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  name: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  noLoanCard: { borderRadius: 20, padding: 40, borderWidth: 1, alignItems: "center", gap: 12 },
  noLoanTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  noLoanSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  heroCard: { borderRadius: 20, padding: 22, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  heroLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  heroAmount: { color: "#fff", fontSize: 34, fontFamily: "Inter_700Bold", marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 18 },
  heroRow: { flexDirection: "row", justifyContent: "space-between" },
  heroStat: { alignItems: "center" },
  heroStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatValue: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  progressCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14, gap: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  progressPercent: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressBg: { height: 8, borderRadius: 100 },
  progressFill: { height: 8, borderRadius: 100 },
  progressStats: { flexDirection: "row", justifyContent: "space-between" },
  pStat: { alignItems: "center" },
  pStatVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  infoCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 6 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, marginBottom: 8 },
  payBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  completedBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 14 },
  completedText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 24, gap: 16 },
  emiHint: { flexDirection: "row", padding: 14, borderRadius: 12 },
  emiHintText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emiHintVal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  formError: { fontFamily: "Inter_500Medium", fontSize: 13 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10 },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
