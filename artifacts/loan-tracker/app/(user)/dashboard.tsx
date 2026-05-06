import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getLoansByUser } from "@/services/loanService";
import { submitPayment } from "@/services/paymentService";
import { getNotificationsForUser, markAllRead } from "@/services/notificationService";
import { signOut } from "@/services/authService";
import { NotificationBanner } from "@/components/NotificationBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PaymentMode } from "@/services/paymentService";
import { calculateLoanBreakdown } from "@/services/loanService";

const PAYMENT_MODES: { mode: PaymentMode; icon: string; color: string; bg: string; label: string }[] = [
  { mode: "PhonePe",    icon: "cellphone", color: "#7B3FE4", bg: "#7B3FE422", label: "PhonePe" },
  { mode: "Google Pay", icon: "google",    color: "#4285F4", bg: "#4285F422", label: "GPay" },
  { mode: "Cash",       icon: "cash",      color: "#00C896", bg: "#00C89622", label: "Cash" },
];

export default function UserDashboard() {
  const c = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("Cash");
  const [payError, setPayError] = useState("");
  const [notifPanel, setNotifPanel] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [calcModal, setCalcModal] = useState(false);
  const [calcAmount, setCalcAmount] = useState("");
  const [calcRate, setCalcRate] = useState("");
  const [calcDuration, setCalcDuration] = useState("");

  const calcResult = useMemo(() => {
    const p = parseFloat(calcAmount);
    const r = parseFloat(calcRate);
    const d = parseInt(calcDuration);
    if (!p || !r || !d || p <= 0 || r <= 0 || d <= 0) return null;
    return calculateLoanBreakdown(p, r, d);
  }, [calcAmount, calcRate, calcDuration]);

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ["userLoans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotificationsForUser(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const loan = loans[0];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const payMutation = useMutation({
    mutationFn: ({ loanId, amount }: { loanId: string; amount: number }) =>
      submitPayment(loanId, user!.id, amount, payMode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userPayments", user?.id] });
      setPayModal(false);
      setPayAmount("");
      setNotification({ msg: `Payment submitted via ${payMode}! Awaiting admin confirmation.`, type: "info" });
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

  const openNotifications = useCallback(async () => {
    setNotifPanel(true);
    if (unreadCount > 0 && user) {
      await markAllRead(user.id).catch(() => {});
      refetchNotifs();
    }
  }, [unreadCount, user, refetchNotifs]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchNotifs()]);
  }, [refetch, refetchNotifs]);

  const progress = loan ? Math.min(loan.paidAmount / loan.totalAmount, 1) : 0;
  const paidMonths = loan ? Math.round(progress * loan.duration) : 0;
  const remainingMonths = loan ? loan.duration - paidMonths : 0;
  const nextDue = loan ? (() => {
    const start = new Date(loan.startDate);
    const next = new Date(start.getFullYear(), start.getMonth() + paidMonths + 1, start.getDate());
    return next.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  })() : null;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return (
    <View style={[styles.loading, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: "#00A86B" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#00A86B" />

      {notification && (
        <NotificationBanner
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
          duration={4000}
        />
      )}

      {/* Green gradient header */}
      <View style={styles.headerBg}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Welcome back 👋</Text>
              <Text style={styles.name}>{user?.name?.split(" ")[0]}</Text>
              {user?.phone ? (
                <View style={styles.phoneRow}>
                  <Feather name="phone" size={11} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.phoneTxt}>+91 {user.phone}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={openNotifications}>
                <Feather name="bell" size={18} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.themeRow}>
                <Feather name={isDark ? "moon" : "sun"} size={15} color="rgba(255,255,255,0.8)" />
                <Switch value={isDark} onValueChange={toggleTheme}
                  trackColor={{ false: "rgba(255,255,255,0.3)", true: "rgba(255,255,255,0.5)" }}
                  thumbColor="#fff"
                />
              </View>
              <TouchableOpacity onPress={handleSignOut} style={styles.iconBtn}>
                <Feather name="log-out" size={16} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={[styles.body, { backgroundColor: c.background }]}
        contentContainerStyle={[styles.container, { paddingBottom: bottomPad + 90 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {!loan ? (
          <>
            <View style={[styles.noLoanCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="inbox" size={44} color={c.mutedForeground} />
              <Text style={[styles.noLoanTitle, { color: c.foreground }]}>No Active Loan</Text>
              <Text style={[styles.noLoanSub, { color: c.mutedForeground }]}>Contact your admin to set up a loan.</Text>
            </View>
            {/* EMI Calculator always accessible */}
            <TouchableOpacity
              style={[styles.scheduleBtn, { borderColor: "#0D47A1", marginTop: 16 }]}
              onPress={() => setCalcModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="calculator" size={16} color="#0D47A1" />
              <Text style={[styles.scheduleBtnText, { color: "#0D47A1" }]}>EMI Calculator</Text>
              <Feather name="chevron-right" size={16} color="#0D47A1" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Loan Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Total Loan Amount</Text>
                  <Text style={styles.heroAmount}>₹{loan.amount.toLocaleString()}</Text>
                </View>
                <StatusBadge status={loan.status} size="md" />
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Interest</Text>
                  <Text style={styles.heroStatValue}>
                    {loan.interest}% → ₹{(
                      loan.interestAmount && loan.interestAmount > 0
                        ? loan.interestAmount
                        : Math.round(loan.amount * loan.interest / 100 * 100) / 100
                    ).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>EMI</Text>
                  <Text style={styles.heroStatValue}>₹{loan.emi.toLocaleString()}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Duration</Text>
                  <Text style={styles.heroStatValue}>{loan.duration} mo</Text>
                </View>
              </View>
            </View>

            {/* 3 Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: c.primary + "15" }]}>
                  <Feather name="credit-card" size={16} color={c.primary} />
                </View>
                <Text style={[styles.summaryVal, { color: c.foreground }]}>₹{loan.totalAmount.toLocaleString()}</Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Total Payable</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: c.success + "20" }]}>
                  <Feather name="check-circle" size={16} color={c.success} />
                </View>
                <Text style={[styles.summaryVal, { color: c.success }]}>₹{loan.paidAmount.toLocaleString()}</Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Paid</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={[styles.summaryIcon, { backgroundColor: c.warning + "20" }]}>
                  <Feather name="clock" size={16} color={c.warning} />
                </View>
                <Text style={[styles.summaryVal, { color: c.warning }]}>₹{loan.pendingAmount.toLocaleString()}</Text>
                <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Pending</Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: c.foreground }]}>Repayment Progress</Text>
                <Text style={[styles.progressPercent, { color: c.primary }]}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={[styles.progressBg, { backgroundColor: c.muted }]}>
                <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` as any, backgroundColor: c.accent }]} />
              </View>
              <View style={styles.progressStats}>
                <Text style={[styles.pStat, { color: c.mutedForeground }]}>{paidMonths} months paid</Text>
                <Text style={[styles.pStat, { color: c.mutedForeground }]}>{remainingMonths} months left</Text>
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
                <Feather name="trending-down" size={18} color={c.warning} />
                <Text style={[styles.infoLabel, { color: c.mutedForeground }]}>Remaining</Text>
                <Text style={[styles.infoValue, { color: c.foreground }]}>{remainingMonths} months</Text>
              </View>
            </View>

            {/* Pay EMI */}
            {loan.status === "active" && (
              <>
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>Pay EMI via</Text>
                <View style={styles.payModesRow}>
                  {PAYMENT_MODES.map((m) => (
                    <TouchableOpacity
                      key={m.mode}
                      style={[styles.payModeCard, { backgroundColor: m.bg, borderColor: m.color + "60" }]}
                      onPress={() => {
                        setPayMode(m.mode);
                        setPayAmount(String(loan.emi));
                        setPayError("");
                        setPayModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name={m.icon as any} size={26} color={m.color} />
                      <Text style={[styles.payModeName, { color: m.color }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* View Schedule button */}
            <TouchableOpacity
              style={[styles.scheduleBtn, { borderColor: c.primary }]}
              onPress={() => router.push("/(user)/schedule")}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={16} color={c.primary} />
              <Text style={[styles.scheduleBtnText, { color: c.primary }]}>View Full Repayment Schedule</Text>
              <Feather name="chevron-right" size={16} color={c.primary} />
            </TouchableOpacity>

            {/* EMI Calculator button */}
            <TouchableOpacity
              style={[styles.scheduleBtn, { borderColor: "#0D47A1" }]}
              onPress={() => setCalcModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="calculator" size={16} color="#0D47A1" />
              <Text style={[styles.scheduleBtnText, { color: "#0D47A1" }]}>EMI Calculator</Text>
              <Feather name="chevron-right" size={16} color="#0D47A1" />
            </TouchableOpacity>

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
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Selected Mode */}
            <View style={[styles.selectedModeBox, { backgroundColor: c.secondary }]}>
              <MaterialCommunityIcons
                name={(PAYMENT_MODES.find((m) => m.mode === payMode)?.icon ?? "cash") as any}
                size={24}
                color={PAYMENT_MODES.find((m) => m.mode === payMode)?.color ?? c.primary}
              />
              <Text style={[styles.selectedModeText, { color: c.foreground }]}>
                Paying via <Text style={{ fontFamily: "Inter_700Bold", color: PAYMENT_MODES.find((m) => m.mode === payMode)?.color }}>
                  {payMode}
                </Text>
              </Text>
            </View>

            {/* Switch Mode */}
            <Text style={[styles.switchLabel, { color: c.mutedForeground }]}>Switch payment method:</Text>
            <View style={styles.switchModes}>
              {PAYMENT_MODES.map((m) => (
                <TouchableOpacity
                  key={m.mode}
                  style={[styles.switchModeBtn,
                    { backgroundColor: payMode === m.mode ? m.color : c.muted,
                      borderColor: payMode === m.mode ? m.color : c.border }
                  ]}
                  onPress={() => setPayMode(m.mode)}
                >
                  <MaterialCommunityIcons name={m.icon as any} size={16} color={payMode === m.mode ? "#fff" : c.mutedForeground} />
                  <Text style={[styles.switchModeText, { color: payMode === m.mode ? "#fff" : c.mutedForeground }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loan && (
              <View style={[styles.emiHint, { backgroundColor: c.muted }]}>
                <Text style={[styles.emiHintText, { color: c.mutedForeground }]}>Monthly EMI: </Text>
                <Text style={[styles.emiHintVal, { color: c.foreground }]}>₹{loan.emi.toLocaleString()}</Text>
              </View>
            )}

            {payError ? (
              <View style={[styles.errBox, { backgroundColor: c.destructive + "15" }]}>
                <Feather name="alert-circle" size={14} color={c.destructive} />
                <Text style={[styles.errText, { color: c.destructive }]}>{payError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Payment Amount (₹)</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Text style={[styles.rupee, { color: c.mutedForeground }]}>₹</Text>
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
                Payment stays pending until admin confirms it.
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
          </ScrollView>
        </View>
      </Modal>

      {/* EMI Calculator Modal */}
      <Modal visible={calcModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCalcModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>EMI Calculator</Text>
            <TouchableOpacity onPress={() => setCalcModal(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Inputs */}
            {([
              { label: "Loan Amount (₹)", val: calcAmount, set: setCalcAmount, placeholder: "e.g. 100000", dec: true },
              { label: "Annual Interest Rate (%)", val: calcRate, set: setCalcRate, placeholder: "e.g. 12", dec: true },
              { label: "Duration (months)", val: calcDuration, set: setCalcDuration, placeholder: "e.g. 24", dec: false },
            ] as const).map((f) => (
              <View key={f.label} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{f.label}</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder={f.placeholder}
                    placeholderTextColor={c.mutedForeground}
                    value={f.val}
                    onChangeText={f.set}
                    keyboardType={f.dec ? "decimal-pad" : "number-pad"}
                  />
                </View>
              </View>
            ))}

            {/* Results */}
            {calcResult ? (
              <View style={[styles.calcResultCard, { backgroundColor: "#00A86B" + "10", borderColor: "#00A86B" + "30" }]}>
                <View style={[styles.calcEmiBox, { backgroundColor: "#00A86B" }]}>
                  <Text style={styles.calcEmiLabel}>Monthly EMI</Text>
                  <Text style={styles.calcEmiAmt}>₹{calcResult.emi.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.calcGrid}>
                  <View style={[styles.calcGridItem, { backgroundColor: c.background }]}>
                    <Text style={[styles.calcGridLabel, { color: c.mutedForeground }]}>Principal</Text>
                    <Text style={[styles.calcGridVal, { color: c.foreground }]}>₹{parseFloat(calcAmount).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.calcGridItem, { backgroundColor: c.background }]}>
                    <Text style={[styles.calcGridLabel, { color: c.mutedForeground }]}>Interest</Text>
                    <Text style={[styles.calcGridVal, { color: "#F5A623" }]}>₹{calcResult.interestAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={[styles.calcGridItem, { backgroundColor: c.background }]}>
                    <Text style={[styles.calcGridLabel, { color: c.mutedForeground }]}>Total Payable</Text>
                    <Text style={[styles.calcGridVal, { color: "#0D47A1" }]}>₹{calcResult.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={[styles.calcGridItem, { backgroundColor: c.background }]}>
                    <Text style={[styles.calcGridLabel, { color: c.mutedForeground }]}>Duration</Text>
                    <Text style={[styles.calcGridVal, { color: c.foreground }]}>{calcDuration} months</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.calcHint, { backgroundColor: c.muted }]}>
                <Feather name="info" size={16} color={c.mutedForeground} />
                <Text style={[styles.calcHintText, { color: c.mutedForeground }]}>
                  Enter loan details above to calculate your EMI instantly.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Notifications Panel */}
      <Modal visible={notifPanel} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotifPanel(false)}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifPanel(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.notifList}>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Feather name="bell-off" size={36} color={c.mutedForeground} />
                <Text style={[styles.notifEmptyText, { color: c.mutedForeground }]}>No notifications yet</Text>
              </View>
            ) : notifications.map((n) => (
              <View
                key={n.id}
                style={[styles.notifItem, {
                  backgroundColor: n.read ? c.card : c.primary + "10",
                  borderColor: n.read ? c.border : c.primary + "30",
                }]}
              >
                <View style={[styles.notifIconBox, {
                  backgroundColor: n.type === "alert" ? c.destructive + "20" : c.success + "20",
                }]}>
                  <Feather
                    name={n.type === "alert" ? "alert-circle" : "check-circle"}
                    size={16}
                    color={n.type === "alert" ? c.destructive : c.success}
                  />
                </View>
                <View style={styles.notifInfo}>
                  <Text style={[styles.notifMsg, { color: c.foreground }]}>{n.message}</Text>
                  <Text style={[styles.notifTime, { color: c.mutedForeground }]}>
                    {new Date(n.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                {!n.read && <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Green header
  headerBg: { backgroundColor: "#00A86B", paddingBottom: 24, overflow: "hidden" },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -50,
  },
  circle2: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)", bottom: -30, left: 10,
  },
  headerContent: { paddingHorizontal: 16 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  container: { padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  phoneTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", position: "relative" },
  badge: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  // Schedule button
  scheduleBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  scheduleBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  noLoanCard: { borderRadius: 20, padding: 40, borderWidth: 1, alignItems: "center", gap: 12 },
  noLoanTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  noLoanSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  // Hero
  heroCard: { borderRadius: 20, padding: 22, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  heroLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  heroAmount: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 18 },
  heroRow: { flexDirection: "row", justifyContent: "space-between" },
  heroStat: { alignItems: "center", flex: 1 },
  heroStatLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatValue: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 3, textAlign: "center" },
  // 3-column summary cards
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 12,
    alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  summaryIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  // Progress
  progressCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 14, gap: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  progressPercent: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressBg: { height: 10, borderRadius: 100 },
  progressFill: { height: 10, borderRadius: 100 },
  progressStats: { flexDirection: "row", justifyContent: "space-between" },
  pStat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Info
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  infoCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 6 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Payment mode cards
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  payModesRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  payModeCard: {
    flex: 1, alignItems: "center", gap: 8, paddingVertical: 18, borderRadius: 16, borderWidth: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  payModeName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  // Completed
  completedBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 14 },
  completedText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  // Calc modal
  calcResultCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  calcEmiBox: { borderRadius: 12, padding: 18, alignItems: "center" },
  calcEmiLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  calcEmiAmt: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  calcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  calcGridItem: { flex: 1, minWidth: "45%", borderRadius: 10, padding: 12 },
  calcGridLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  calcGridVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  calcHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 14, borderRadius: 12 },
  calcHintText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  // Modal
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 24, gap: 16 },
  selectedModeBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12 },
  selectedModeText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  switchLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  switchModes: { flexDirection: "row", gap: 10 },
  switchModeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  switchModeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emiHint: { flexDirection: "row", padding: 14, borderRadius: 12 },
  emiHintText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  emiHintVal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  errBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8 },
  errText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rupee: { fontSize: 16, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10 },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  // Notifications
  notifList: { padding: 20, gap: 10 },
  notifEmpty: { alignItems: "center", paddingTop: 60, gap: 12 },
  notifEmptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  notifItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  notifIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifInfo: { flex: 1 },
  notifMsg: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
