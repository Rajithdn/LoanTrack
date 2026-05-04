import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import type { Payment } from "@/services/paymentService";

interface PaymentItemProps {
  payment: Payment;
  onConfirm?: () => void;
  onReject?: () => void;
  userName?: string;
  loanAmount?: string;
}

export function PaymentItem({ payment, onConfirm, onReject, userName, loanAmount }: PaymentItemProps) {
  const c = useColors();
  const date = new Date(payment.date);
  const formatted = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <View style={[styles.item, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: c.primary + "15" }]}>
          <Feather name="credit-card" size={18} color={c.primary} />
        </View>
        <View style={styles.info}>
          {userName ? <Text style={[styles.name, { color: c.mutedForeground }]}>{userName}</Text> : null}
          <Text style={[styles.amount, { color: c.foreground }]}>₹{payment.amount.toLocaleString()}</Text>
          <Text style={[styles.date, { color: c.mutedForeground }]}>{formatted}</Text>
        </View>
        <StatusBadge status={payment.status} />
      </View>

      {payment.status === "pending" && (onConfirm || onReject) && (
        <View style={styles.actions}>
          {onReject && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: c.destructive + "15", borderColor: c.destructive + "40" }]}
              onPress={onReject}
            >
              <Feather name="x" size={14} color={c.destructive} />
              <Text style={[styles.btnText, { color: c.destructive }]}>Reject</Text>
            </TouchableOpacity>
          )}
          {onConfirm && (
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, { backgroundColor: c.success, borderColor: c.success }]}
              onPress={onConfirm}
            >
              <Feather name="check" size={14} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {},
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
