import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import type { Payment, PaymentMode } from "@/services/paymentService";

interface PaymentItemProps {
  payment: Payment;
  onConfirm?: () => void;
  onReject?: () => void;
  onDownloadReceipt?: () => void;
  receiptLoading?: boolean;
  userName?: string;
  loanAmount?: string;
}

const MODE_META: Record<PaymentMode, { icon: string; color: string; bg: string }> = {
  PhonePe:        { icon: "cellphone",        color: "#7B3FE4", bg: "#7B3FE418" },
  "Google Pay":   { icon: "google",           color: "#4285F4", bg: "#4285F418" },
  Cash:           { icon: "cash",             color: "#00C896", bg: "#00C89618" },
  "Bank Transfer":{ icon: "bank",             color: "#F59E0B", bg: "#F59E0B18" },
};

export function PaymentItem({
  payment,
  onConfirm,
  onReject,
  onDownloadReceipt,
  receiptLoading,
  userName,
  loanAmount,
}: PaymentItemProps) {
  const c = useColors();
  const date = new Date(payment.date);
  const formatted = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const confirmedDate = payment.confirmedAt
    ? new Date(payment.confirmedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  const modeMeta = payment.paymentMode ? MODE_META[payment.paymentMode] : null;

  return (
    <View style={[styles.item, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, modeMeta ? { backgroundColor: modeMeta.bg } : { backgroundColor: c.primary + "15" }]}>
          {modeMeta ? (
            <MaterialCommunityIcons name={modeMeta.icon as any} size={20} color={modeMeta.color} />
          ) : (
            <Feather name="credit-card" size={18} color={c.primary} />
          )}
        </View>
        <View style={styles.info}>
          {userName ? (
            <Text style={[styles.name, { color: c.mutedForeground }]}>{userName}</Text>
          ) : null}
          <Text style={[styles.amount, { color: c.foreground }]}>₹{payment.amount.toLocaleString()}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.date, { color: c.mutedForeground }]}>{formatted}</Text>
            {payment.paymentMode ? (
              <>
                <Text style={[styles.dot, { color: c.mutedForeground }]}>·</Text>
                <Text style={[styles.modeTag, { color: modeMeta?.color ?? c.primary }]}>
                  {payment.paymentMode}
                </Text>
              </>
            ) : null}
          </View>
          {loanAmount ? (
            <Text style={[styles.loanRef, { color: c.mutedForeground }]}>Loan: {loanAmount}</Text>
          ) : null}
          {payment.note ? (
            <Text style={[styles.note, { color: c.mutedForeground }]} numberOfLines={1}>
              Note: {payment.note}
            </Text>
          ) : null}
          {confirmedDate && payment.updatedBy ? (
            <Text style={[styles.confirmedBy, { color: c.mutedForeground }]}>
              Confirmed {confirmedDate} by {payment.updatedBy}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={payment.status} />
      </View>

      {/* Pending: Reject + Confirm actions */}
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
              style={[styles.btn, styles.confirmBtn, { backgroundColor: c.success }]}
              onPress={onConfirm}
            >
              <Feather name="check" size={14} color="#fff" />
              <Text style={[styles.btnText, { color: "#fff" }]}>Confirm Payment</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Confirmed: Download Receipt */}
      {payment.status === "confirmed" && onDownloadReceipt && (
        <TouchableOpacity
          style={[styles.receiptBtn, { borderColor: c.primary + "50", backgroundColor: c.primary + "10" }]}
          onPress={onDownloadReceipt}
          disabled={receiptLoading}
          activeOpacity={0.8}
        >
          {receiptLoading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <Feather name="download" size={13} color={c.primary} />
          )}
          <Text style={[styles.receiptBtnText, { color: c.primary }]}>
            {receiptLoading ? "Generating..." : "Download Receipt"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  amount: { fontSize: 17, fontFamily: "Inter_700Bold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dot: { fontSize: 12 },
  modeTag: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  loanRef: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  note: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, fontStyle: "italic" },
  confirmedBy: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  confirmBtn: { borderWidth: 0 },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  receiptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  receiptBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
