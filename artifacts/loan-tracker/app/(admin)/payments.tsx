import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getAllPayments, confirmPayment } from "@/services/paymentService";
import { getAllLoans } from "@/services/loanService";
import { getAllUsers } from "@/services/userService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentItem } from "@/components/PaymentItem";
import { NotificationBanner } from "@/components/NotificationBanner";
import { ScreenHeader } from "@/components/ScreenHeader";
import type { Payment } from "@/services/paymentService";
import type { Loan } from "@/services/loanService";

export default function PaymentsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "confirmed" | "all">("pending");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: payments = [], isLoading } = useQuery({ queryKey: ["payments"], queryFn: getAllPayments });
  const { data: loans = [] } = useQuery({ queryKey: ["loans"], queryFn: getAllLoans });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });

  const loanMap = new Map<string, Loan>(loans.map((l) => [l.id, l]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const confirmMutation = useMutation({
    mutationFn: ({ payment, loan }: { payment: Payment; loan: Loan }) => confirmPayment(payment, loan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["loans"] });
      setNotification({ msg: "Payment confirmed successfully!", type: "success" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      setNotification({ msg: "Failed to confirm payment", type: "error" });
    },
  });

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

      <ScreenHeader
        title="Payments"
        subtitle="Review & approve"
      />

      {/* Filter tabs */}
      <View style={[styles.filterRow, { paddingHorizontal: 20, borderBottomColor: c.border }]}>
        {([
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "confirmed", label: `Confirmed (${confirmedCount})` },
          { key: "all", label: "All" },
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
          scrollEnabled={!!filtered.length}
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
                    ? () => confirmMutation.mutate({ payment: item, loan })
                    : undefined
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 12, borderBottomWidth: 0 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
