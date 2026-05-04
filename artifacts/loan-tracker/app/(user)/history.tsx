import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getPaymentsByUser } from "@/services/paymentService";
import { useQuery } from "@tanstack/react-query";
import { PaymentItem } from "@/components/PaymentItem";
import { ScreenHeader } from "@/components/ScreenHeader";

const MODE_META: Record<string, { icon: string; color: string }> = {
  PhonePe:        { icon: "cellphone", color: "#7B3FE4" },
  "Google Pay":   { icon: "google",    color: "#4285F4" },
  Cash:           { icon: "cash",      color: "#00C896" },
  "Bank Transfer":{ icon: "bank",      color: "#F59E0B" },
};

export default function HistoryScreen() {
  const c = useColors();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["userPayments", user?.id],
    queryFn: () => getPaymentsByUser(user!.id),
    enabled: !!user,
  });

  const totalPaid = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const confirmedCount = payments.filter((p) => p.status === "confirmed").length;

  // Payment mode breakdown
  const modeBreakdown: Record<string, number> = {};
  payments.filter((p) => p.status === "confirmed" && p.paymentMode).forEach((p) => {
    const mode = p.paymentMode!;
    modeBreakdown[mode] = (modeBreakdown[mode] ?? 0) + p.amount;
  });

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={["top"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={c.background} />

      <ScreenHeader
        title="Payment History"
        subtitle={`${payments.length} transactions`}
      />

      {/* Summary */}
      <View style={[styles.summaryRow, { paddingHorizontal: 20 }]}>
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
        <View style={[styles.modeBreakdown, { paddingHorizontal: 20 }]}>
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

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
          scrollEnabled
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summaryRow: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  summaryItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  summaryVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  modeBreakdown: { marginBottom: 4 },
  modeTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  modeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  modeChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modeChipAmt: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 30 },
});
