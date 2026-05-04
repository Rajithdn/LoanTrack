import React from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getPaymentsByUser } from "@/services/paymentService";
import { useQuery } from "@tanstack/react-query";
import { PaymentItem } from "@/components/PaymentItem";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function HistoryScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["userPayments", user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user,
  });

  const totalPaid = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader
        title="Payment History"
        subtitle={`${payments.length} transactions`}
      />

      {/* Summary row */}
      <View style={[styles.summaryRow, { paddingHorizontal: 20, borderBottomColor: c.border }]}>
        <View style={[styles.summaryItem, { backgroundColor: c.success + "18" }]}>
          <Feather name="check-circle" size={14} color={c.success} />
          <Text style={[styles.summaryVal, { color: c.success }]}>₹{totalPaid.toLocaleString()}</Text>
          <Text style={[styles.summaryLabel, { color: c.success }]}>Confirmed</Text>
        </View>
        <View style={[styles.summaryItem, { backgroundColor: c.warning + "18" }]}>
          <Feather name="clock" size={14} color={c.warning} />
          <Text style={[styles.summaryVal, { color: c.warning }]}>{pendingCount}</Text>
          <Text style={[styles.summaryLabel, { color: c.warning }]}>Pending</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
          scrollEnabled={!!payments.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="list" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No payments yet</Text>
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                Submit your first EMI payment from the dashboard.
              </Text>
            </View>
          }
          renderItem={({ item }) => <PaymentItem payment={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryRow: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  summaryItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  summaryVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
});
