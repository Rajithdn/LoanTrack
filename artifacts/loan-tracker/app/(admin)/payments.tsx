import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getAllPayments, confirmPayment, rejectPayment } from "@/services/paymentService";
import { getAllLoans } from "@/services/loanService";
import { getAllUsers } from "@/services/userService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentItem } from "@/components/PaymentItem";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { Payment, PaymentMode } from "@/services/paymentService";
import type { Loan } from "@/services/loanService";

const PAYMENT_MODES: { mode: PaymentMode; icon: string; color: string; bg: string }[] = [
  { mode: "PhonePe",       icon: "cellphone",  color: "#7B3FE4", bg: "#7B3FE420" },
  { mode: "Google Pay",    icon: "google",     color: "#4285F4", bg: "#4285F420" },
  { mode: "Cash",          icon: "cash",       color: "#00C896", bg: "#00C89620" },
  { mode: "Bank Transfer", icon: "bank",       color: "#F59E0B", bg: "#F59E0B20" },
];

export default function PaymentsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<"pending" | "confirmed" | "all">("pending");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [txNote, setTxNote] = useState("");

  const { data: payments = [], isLoading } = useQuery({ queryKey: ["payments"], queryFn: getAllPayments });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: getAllLoans });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });

  const loanMap = new Map<string, Loan>(loans.map((l) => [l.id, l]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmPayment(selectedPayment!, selectedLoan!, paymentMode, txNote, user?.name ?? "Admin"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      setConfirmModal(false);
      setNotification({ msg: "Payment confirmed & borrower notified!", type: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      setNotification({ msg: "Failed to confirm payment", type: "error" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, userId, amount }: { paymentId: string; userId: string; amount: number }) =>
      rejectPayment(paymentId, userId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setNotification({ msg: "Payment rejected.", type: "error" });
    },
  });

  const openConfirmModal = (payment: Payment, loan: Loan) => {
    setSelectedPayment(payment);
    setSelectedLoan(loan);
    setPaymentMode("Cash");
    setTxNote("");
    setConfirmModal(true);
  };

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const confirmedCount = payments.filter((p) => p.status === "confirmed").length;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {notification && (
        <NotificationBanner
          message={notification.msg}
          type={notification.type}
          onDismiss={() => setNotification(null)}
        />
      )}

      <ScreenHeader title="Payments" subtitle="Review & approve" />

      {/* Stats row */}
      <View style={[styles.statsRow, { paddingHorizontal: 20, borderBottomColor: c.border }]}>
        <View style={[styles.statBox, { backgroundColor: c.warning + "18" }]}>
          <Text style={[styles.statNum, { color: c.warning }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: c.warning }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.success + "18" }]}>
          <Text style={[styles.statNum, { color: c.success }]}>{confirmedCount}</Text>
          <Text style={[styles.statLabel, { color: c.success }]}>Confirmed</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.primary + "18" }]}>
          <Text style={[styles.statNum, { color: c.primary }]}>{payments.length}</Text>
          <Text style={[styles.statLabel, { color: c.primary }]}>Total</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { paddingHorizontal: 20 }]}>
        {([
          { key: "pending",   label: `Pending (${pendingCount})` },
          { key: "confirmed", label: `Confirmed (${confirmedCount})` },
          { key: "all",       label: "All" },
        ] as const).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && { backgroundColor: c.primary }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, { color: filter === f.key ? "#fff" : c.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
          scrollEnabled
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="check-circle" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                {filter === "pending" ? "No pending payments" : "No payments found"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const loan = loanMap.get(item.loanId);
            return (
              <PaymentItem
                payment={item}
                userName={userMap.get(item.userId) ?? "Unknown"}
                loanAmount={loan ? `₹${loan.amount.toLocaleString()}` : undefined}
                onConfirm={
                  item.status === "pending" && loan
                    ? () => openConfirmModal(item, loan)
                    : undefined
                }
                onReject={
                  item.status === "pending"
                    ? () => rejectMutation.mutate({ paymentId: item.id, userId: item.userId, amount: item.amount })
                    : undefined
                }
              />
            );
          }}
        />
      )}

      {/* Confirm Modal */}
      <Modal
        visible={confirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setConfirmModal(false)}
      >
        <ScrollView
          style={[styles.modalContainer, { backgroundColor: c.background }]}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Confirm Payment</Text>
            <TouchableOpacity onPress={() => setConfirmModal(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          {selectedPayment && (
            <>
              {/* Payment summary */}
              <View style={[styles.summaryBox, { backgroundColor: c.primary + "10", borderColor: c.primary + "30" }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Borrower</Text>
                  <Text style={[styles.summaryVal, { color: c.foreground }]}>
                    {userMap.get(selectedPayment.userId) ?? "Unknown"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Amount</Text>
                  <Text style={[styles.summaryAmt, { color: c.primary }]}>
                    ₹{selectedPayment.amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Submitted</Text>
                  <Text style={[styles.summaryVal, { color: c.foreground }]}>
                    {new Date(selectedPayment.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                </View>
                {selectedPayment.paymentMode && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: c.mutedForeground }]}>Borrower's Method</Text>
                    <Text style={[styles.summaryVal, { color: c.foreground }]}>{selectedPayment.paymentMode}</Text>
                  </View>
                )}
              </View>

              {/* Payment Mode Selector */}
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>Received Via</Text>
              <View style={styles.modesGrid}>
                {PAYMENT_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.mode}
                    style={[
                      styles.modeCard,
                      { backgroundColor: paymentMode === m.mode ? m.bg : c.muted, borderColor: paymentMode === m.mode ? m.color : c.border },
                    ]}
                    onPress={() => setPaymentMode(m.mode)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={24} color={paymentMode === m.mode ? m.color : c.mutedForeground} />
                    <Text style={[styles.modeName, { color: paymentMode === m.mode ? m.color : c.mutedForeground }]}>
                      {m.mode}
                    </Text>
                    {paymentMode === m.mode && (
                      <View style={[styles.modeCheck, { backgroundColor: m.color }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Transaction Note */}
              <Text style={[styles.sectionLabel, { color: c.foreground }]}>Transaction Note (optional)</Text>
              <View style={[styles.noteInput, { borderColor: c.border, backgroundColor: c.muted }]}>
                <TextInput
                  style={[styles.noteText, { color: c.foreground }]}
                  placeholder="e.g. Received in person, UPI ref #123456"
                  placeholderTextColor={c.mutedForeground}
                  value={txNote}
                  onChangeText={setTxNote}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Info */}
              <View style={[styles.infoBox, { backgroundColor: c.accent + "15" }]}>
                <Feather name="bell" size={14} color={c.accent} />
                <Text style={[styles.infoText, { color: c.accent }]}>
                  The borrower will receive an in-app notification once you confirm this payment.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: c.success }, confirmMutation.isPending && { opacity: 0.7 }]}
                onPress={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                activeOpacity={0.85}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm & Notify Borrower</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", gap: 10, paddingVertical: 14 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  statNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  // Modal
  modalContainer: { flex: 1 },
  modalContent: { padding: 24, gap: 16 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 20, borderBottomWidth: 1, marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryBox: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryAmt: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeCard: {
    flex: 1, minWidth: "45%", alignItems: "center", gap: 6,
    paddingVertical: 14, paddingHorizontal: 10,
    borderRadius: 14, borderWidth: 2, position: "relative",
  },
  modeName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  modeCheck: {
    position: "absolute", top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center",
  },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 80 },
  noteText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
