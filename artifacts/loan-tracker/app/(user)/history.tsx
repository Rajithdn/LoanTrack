import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getPaymentsByUser } from "@/services/paymentService";
import { getLoansByUser } from "@/services/loanService";
import { getAllUsers } from "@/services/userService";
import { downloadPaymentReceipt } from "@/services/receiptService";
import { useQuery } from "@tanstack/react-query";
import { PaymentItem } from "@/components/PaymentItem";
import { ScreenHeader } from "@/components/ScreenHeader";
import { NotificationBanner } from "@/components/NotificationBanner";

const MODE_META: Record<string, { icon: string; color: string }> = {
  PhonePe:         { icon: "cellphone", color: "#7B3FE4" },
  "Google Pay":    { icon: "google",    color: "#4285F4" },
  Cash:            { icon: "cash",      color: "#00C896" },
  "Bank Transfer": { icon: "bank",      color: "#F59E0B" },
};

export default function HistoryScreen() {
  const c = useColors();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["userPayments", user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["userLoans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  // For receipt we need borrower profile — use current user
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
    enabled: !!user,
  });

  const loanMap = new Map(loans.map((l) => [l.id, l]));
  const userProfile = allUsers.find((u) => u.id === user?.id) ?? null;

  const handleDownloadReceipt = async (paymentId: string) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;
    const loan = loanMap.get(payment.loanId);
    if (!loan || !userProfile) {
      setNotification({ msg: "Could not load receipt data. Please try again.", type: "error" });
      return;
    }
    setReceiptLoadingId(paymentId);
    try {
      await downloadPaymentReceipt(payment, loan, userProfile, payment.updatedBy ?? "Admin");
    } catch (e: any) {
      setNotification({ msg: e?.message ?? "Failed to generate receipt.", type: "error" });
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const totalPaid     = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const pendingCount  = payments.filter((p) => p.status === "pending").length;
  const confirmedCount = payments.filter((p) => p.status === "confirmed").length;

  const modeBreakdown: Record<string, number> = {};
  payments
    .filter((p) => p.status === "confirmed" && p.paymentMode)
    .forEach((p) => {
      const mode = p.paymentMode!;
      modeBreakdown[mode] = (modeBreakdown[mode] ?? 0) + p.amount;
    });

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const ListHeader = (
    <View style={styles.listHeader}>
      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, { backgroundColor: c.success + "18" }]}>
          <Feather name="check-circle" size={16} color={c.success} />
          <View>
            <Text style={[styles.summaryVal, { color: c.success }]}>₹{totalPaid.toLocaleString()}</Text>
            <Text style={[styles.summaryLabel, { color: c.success }]}>{confirmedCount} Confirmed</Text>
          </View>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: c.warning + "18" }]}>
          <Feather name="clock" size={16} color={c.warning} />
          <View>
            <Text style={[styles.summaryVal, { color: c.warning }]}>{pendingCount}</Text>
            <Text style={[styles.summaryLabel, { color: c.warning }]}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Payment mode breakdown */}
      {Object.keys(modeBreakdown).length > 0 && (
        <View style={styles.modeBreakdown}>
          <Text style={[styles.modeTitle, { color: c.mutedForeground }]}>Paid via</Text>
          <View style={styles.modeChips}>
            {Object.entries(modeBreakdown).map(([mode, amount]) => {
              const meta = MODE_META[mode] ?? { icon: "cash", color: c.primary };
              return (
                <View key={mode} style={[styles.modeChip, { backgroundColor: meta.color + "15", borderColor: meta.color + "40" }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={14} color={meta.color} />
                  <Text style={[styles.modeChipText, { color: meta.color }]}>{mode}</Text>
                  <Text style={[styles.modeChipAmt, { color: meta.color }]}>₹{amount.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {confirmedCount > 0 && (
        <View style={[styles.receiptHint, { backgroundColor: c.primary + "10", borderColor: c.primary + "25" }]}>
          <Feather name="file-text" size={13} color={c.primary} />
          <Text style={[styles.receiptHintText, { color: c.primary }]}>
            Tap the receipt icon on any confirmed payment to download your PDF receipt.
          </Text>
        </View>
      )}
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
        />
      )}

      <ScreenHeader
        title="Payment History"
        subtitle={`${payments.length} transactions`}
      />

      <View style={[styles.body, { backgroundColor: c.background }]}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(p) => p.id}
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 90 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="list" size={40} color={c.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: c.foreground }]}>No payments yet</Text>
                <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                  Submit your first EMI payment from the dashboard.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <PaymentItem
                payment={item}
                onDownloadReceipt={
                  item.status === "confirmed"
                    ? () => handleDownloadReceipt(item.id)
                    : undefined
                }
                receiptLoading={receiptLoadingId === item.id}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: "hidden" },
  listHeader: { marginBottom: 8 },
  summaryRow: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  summaryItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  summaryVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  modeBreakdown: { marginBottom: 12 },
  modeTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  modeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  modeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modeChipAmt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  receiptHint: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },
  receiptHintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
});
