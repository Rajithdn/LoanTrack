import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ScreenHeader } from "@/components/ScreenHeader";
import { calculateLoanBreakdown } from "@/services/loanService";

type ScheduleRow = { month: number; emi: number; principal: number; interest: number; balance: number };

function buildSchedule(principal: number, annualRate: number, months: number): ScheduleRow[] {
  const r = annualRate / 12 / 100;
  const emi = r === 0
    ? principal / months
    : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const rows: ScheduleRow[] = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPart = emi - interest;
    balance = Math.max(balance - principalPart, 0);
    rows.push({ month: i, emi, principal: principalPart, interest, balance });
  }
  return rows;
}

export default function CalculatorScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [duration, setDuration] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const parsed = useMemo(() => {
    const p = parseFloat(amount);
    const r = parseFloat(rate);
    const d = parseInt(duration);
    if (!p || !r || !d || p <= 0 || r <= 0 || d <= 0) return null;
    return { p, r, d };
  }, [amount, rate, duration]);

  const breakdown = useMemo(() => {
    if (!parsed) return null;
    return calculateLoanBreakdown(parsed.p, parsed.r, parsed.d);
  }, [parsed]);

  const schedule = useMemo(() => {
    if (!parsed) return [];
    return buildSchedule(parsed.p, parsed.r, parsed.d);
  }, [parsed]);

  const fmt = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fields = [
    { label: "Loan Amount (₹)", key: "amount", set: setAmount, val: amount, placeholder: "e.g. 100000", dec: true },
    { label: "Annual Interest Rate (%)", key: "rate", set: setRate, val: rate, placeholder: "e.g. 12", dec: true },
    { label: "Duration (months)", key: "duration", set: setDuration, val: duration, placeholder: "e.g. 24", dec: false },
  ] as const;

  return (
    <View style={[styles.root, { backgroundColor: "#00A86B" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#00A86B" />
      <ScreenHeader title="Loan Calculator" subtitle="EMI & repayment preview" />

      <View style={[styles.body, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Input card */}
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>Loan Details</Text>
              {fields.map((f) => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: c.mutedForeground }]}>{f.label}</Text>
                  <View style={[styles.inputWrap, { borderColor: c.border, backgroundColor: c.muted }]}>
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
            </View>

            {/* Results */}
            {breakdown && (
              <>
                <View style={[styles.resultCard, { backgroundColor: "#00A86B" + "12", borderColor: "#00A86B" + "30" }]}>
                  <Text style={[styles.cardTitle, { color: c.foreground }]}>EMI Summary</Text>

                  <View style={styles.emiRow}>
                    <View style={[styles.emiBig, { backgroundColor: "#00A86B", borderRadius: 16, padding: 20, flex: 1 }]}>
                      <Text style={styles.emiLabel}>Monthly EMI</Text>
                      <Text style={styles.emiAmt}>{fmt(breakdown.emi)}</Text>
                    </View>
                  </View>

                  <View style={styles.resultGrid}>
                    <View style={[styles.resultItem, { backgroundColor: c.background, borderRadius: 12, padding: 14 }]}>
                      <Text style={[styles.resultLabel, { color: c.mutedForeground }]}>Principal</Text>
                      <Text style={[styles.resultVal, { color: c.foreground }]}>{fmt(parsed!.p)}</Text>
                    </View>
                    <View style={[styles.resultItem, { backgroundColor: c.background, borderRadius: 12, padding: 14 }]}>
                      <Text style={[styles.resultLabel, { color: c.mutedForeground }]}>Interest</Text>
                      <Text style={[styles.resultVal, { color: "#F5A623" }]}>{fmt(breakdown.interestAmount)}</Text>
                    </View>
                    <View style={[styles.resultItem, { backgroundColor: c.background, borderRadius: 12, padding: 14, flex: 1 }]}>
                      <Text style={[styles.resultLabel, { color: c.mutedForeground }]}>Total Payable</Text>
                      <Text style={[styles.resultVal, { color: "#0D47A1" }]}>{fmt(breakdown.totalAmount)}</Text>
                    </View>
                    <View style={[styles.resultItem, { backgroundColor: c.background, borderRadius: 12, padding: 14, flex: 1 }]}>
                      <Text style={[styles.resultLabel, { color: c.mutedForeground }]}>Duration</Text>
                      <Text style={[styles.resultVal, { color: c.foreground }]}>{parsed!.d} months</Text>
                    </View>
                  </View>

                  {/* Interest ratio bar */}
                  <View style={styles.barSection}>
                    <View style={styles.barLabels}>
                      <Text style={[styles.barLabelText, { color: "#00A86B" }]}>Principal</Text>
                      <Text style={[styles.barLabelText, { color: "#F5A623" }]}>Interest</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[styles.barFill, {
                          flex: parsed!.p,
                          backgroundColor: "#00A86B",
                        }]}
                      />
                      <View
                        style={[styles.barFill, {
                          flex: breakdown.interestAmount,
                          backgroundColor: "#F5A623",
                        }]}
                      />
                    </View>
                    <View style={styles.barLabels}>
                      <Text style={[styles.barPct, { color: "#00A86B" }]}>
                        {Math.round((parsed!.p / breakdown.totalAmount) * 100)}%
                      </Text>
                      <Text style={[styles.barPct, { color: "#F5A623" }]}>
                        {Math.round((breakdown.interestAmount / breakdown.totalAmount) * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Schedule toggle */}
                <TouchableOpacity
                  style={[styles.scheduleToggle, { borderColor: "#00A86B" + "60", backgroundColor: "#00A86B" + "10" }]}
                  onPress={() => setShowSchedule((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Feather name="calendar" size={16} color="#00A86B" />
                  <Text style={[styles.scheduleToggleText, { color: "#00A86B" }]}>
                    {showSchedule ? "Hide" : "View"} Month-by-Month Schedule
                  </Text>
                  <Feather name={showSchedule ? "chevron-up" : "chevron-down"} size={16} color="#00A86B" />
                </TouchableOpacity>

                {showSchedule && (
                  <View style={[styles.tableCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    {/* Table header */}
                    <View style={[styles.tableHeader, { borderBottomColor: c.border, backgroundColor: c.muted }]}>
                      {["Mo.", "EMI", "Principal", "Interest", "Balance"].map((h) => (
                        <Text key={h} style={[styles.th, { color: c.mutedForeground }]}>{h}</Text>
                      ))}
                    </View>
                    {schedule.map((row) => (
                      <View
                        key={row.month}
                        style={[
                          styles.tableRow,
                          { borderBottomColor: c.border },
                          row.month % 2 === 0 ? { backgroundColor: c.muted + "60" } : {},
                        ]}
                      >
                        <Text style={[styles.td, { color: "#00A86B", fontFamily: "Inter_700Bold" }]}>
                          {row.month}
                        </Text>
                        <Text style={[styles.td, { color: c.foreground }]}>
                          {fmt(row.emi)}
                        </Text>
                        <Text style={[styles.td, { color: "#0D47A1" }]}>
                          {fmt(row.principal)}
                        </Text>
                        <Text style={[styles.td, { color: "#F5A623" }]}>
                          {fmt(row.interest)}
                        </Text>
                        <Text style={[styles.td, { color: c.mutedForeground }]}>
                          {fmt(row.balance)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {!breakdown && (
              <View style={[styles.emptyHint, { backgroundColor: c.muted }]}>
                <Feather name="info" size={18} color={c.mutedForeground} />
                <Text style={[styles.emptyHintText, { color: c.mutedForeground }]}>
                  Enter loan amount, rate, and duration to calculate EMI instantly.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: "hidden" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, gap: 14 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular" },
  resultCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14, gap: 14 },
  emiRow: { flexDirection: "row", gap: 10 },
  emiBig: { alignItems: "center" },
  emiLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  emiAmt: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resultItem: { minWidth: "45%", flex: 1 },
  resultLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  resultVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  barSection: { gap: 6 },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barLabelText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  barPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  barTrack: { height: 10, borderRadius: 5, flexDirection: "row", overflow: "hidden" },
  barFill: { height: 10 },
  scheduleToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, marginBottom: 14,
  },
  scheduleToggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 14 },
  tableHeader: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  th: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  tableRow: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  td: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  emptyHint: { borderRadius: 14, padding: 16, flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 8 },
  emptyHintText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
