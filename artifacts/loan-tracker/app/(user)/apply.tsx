import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  submitLoanApplication,
  getApplicationsByUser,
  type LoanApplication,
} from "@/services/loanApplicationService";
import { calculateLoanBreakdown } from "@/services/loanService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScreenHeader } from "@/components/ScreenHeader";

const GREEN = "#00A86B";

const PURPOSES = [
  "Home Renovation",
  "Medical Emergency",
  "Education",
  "Business",
  "Vehicle",
  "Personal",
  "Other",
];

function StatusBadge({ status }: { status: LoanApplication["status"] }) {
  const config = {
    pending: { bg: "#FFF3CD", text: "#856404", label: "Pending Review" },
    approved: { bg: "#D1FAE5", text: "#065F46", label: "Approved" },
    rejected: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected" },
  }[status];
  return (
    <View style={[sbStyles.badge, { backgroundColor: config.bg }]}>
      <Text style={[sbStyles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}
const sbStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

export default function ApplyScreen() {
  const c = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [showPurposePicker, setShowPurposePicker] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    queryFn: () => getApplicationsByUser(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitLoanApplication(
        user!.id,
        user!.name,
        user!.email,
        parseFloat(amount),
        purpose,
        parseInt(duration),
        message.trim()
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      setAmount("");
      setDuration("");
      setPurpose("");
      setMessage("");
      setFormError("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    },
    onError: () => setFormError("Failed to submit. Please try again."),
  });

  const breakdown =
    amount && duration && parseFloat(amount) > 0 && parseInt(duration) > 0
      ? calculateLoanBreakdown(parseFloat(amount), 12, parseInt(duration))
      : null;

  const handleSubmit = async () => {
    if (!amount || !duration || !purpose) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError("Enter a valid loan amount.");
      return;
    }
    if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      setFormError("Enter a valid duration.");
      return;
    }
    setFormError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    mutation.mutate();
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: GREEN }]}>
      <ScreenHeader title="Apply for Loan" subtitle="Submit a new loan request" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[styles.body, { backgroundColor: c.background }]}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {submitted && (
            <View style={[styles.successBox, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}>
              <Feather name="check-circle" size={18} color="#065F46" />
              <Text style={[styles.successText, { color: "#065F46" }]}>
                Application submitted! The admin will review it soon.
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Loan Details</Text>

            {formError ? (
              <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={[styles.errorText, { color: "#EF4444" }]}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.mutedForeground }]}>Loan Amount (₹) *</Text>
              <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Feather name="dollar-sign" size={16} color={c.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  placeholder="e.g. 50000"
                  placeholderTextColor={c.mutedForeground}
                  value={amount}
                  onChangeText={(v) => { setAmount(v); setFormError(""); }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.mutedForeground }]}>Duration (months) *</Text>
              <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Feather name="clock" size={16} color={c.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  placeholder="e.g. 12"
                  placeholderTextColor={c.mutedForeground}
                  value={duration}
                  onChangeText={(v) => { setDuration(v); setFormError(""); }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.mutedForeground }]}>Purpose *</Text>
              <TouchableOpacity
                style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.muted }]}
                onPress={() => setShowPurposePicker((p) => !p)}
                activeOpacity={0.8}
              >
                <Feather name="tag" size={16} color={c.mutedForeground} />
                <Text style={[styles.input, { color: purpose ? c.foreground : c.mutedForeground }]}>
                  {purpose || "Select a purpose..."}
                </Text>
                <Feather name={showPurposePicker ? "chevron-up" : "chevron-down"} size={16} color={c.mutedForeground} />
              </TouchableOpacity>
              {showPurposePicker && (
                <View style={[styles.purposeDropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                  {PURPOSES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.purposeItem,
                        { borderBottomColor: c.border },
                        purpose === p && { backgroundColor: GREEN + "18" },
                      ]}
                      onPress={() => { setPurpose(p); setShowPurposePicker(false); }}
                    >
                      <Text style={[styles.purposeText, { color: purpose === p ? GREEN : c.foreground }]}>{p}</Text>
                      {purpose === p && <Feather name="check" size={14} color={GREEN} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.mutedForeground }]}>Additional Message (optional)</Text>
              <View style={[styles.textareaRow, { borderColor: c.border, backgroundColor: c.muted }]}>
                <TextInput
                  style={[styles.textarea, { color: c.foreground }]}
                  placeholder="Why do you need this loan?"
                  placeholderTextColor={c.mutedForeground}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {breakdown && (
              <View style={[styles.calcBox, { backgroundColor: GREEN + "10", borderColor: GREEN + "30" }]}>
                <Text style={[styles.calcTitle, { color: GREEN }]}>Estimated at 12% p.a.</Text>
                <View style={styles.calcGrid}>
                  <View style={styles.calcItem}>
                    <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Monthly EMI</Text>
                    <Text style={[styles.calcValue, { color: c.foreground }]}>
                      ₹{breakdown.emi.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                  <View style={styles.calcItem}>
                    <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Total Payable</Text>
                    <Text style={[styles.calcValue, { color: c.foreground }]}>
                      ₹{breakdown.totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                  <View style={styles.calcItem}>
                    <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Interest</Text>
                    <Text style={[styles.calcValue, { color: "#F59E0B" }]}>
                      ₹{breakdown.interestAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.noteBox, { backgroundColor: c.muted, borderColor: c.border }]}>
              <Feather name="info" size={13} color={c.mutedForeground} />
              <Text style={[styles.noteText, { color: c.mutedForeground }]}>
                The admin will review your application and set the final interest rate and terms.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, mutation.isPending && { opacity: 0.75 }]}
              onPress={handleSubmit}
              disabled={mutation.isPending}
              activeOpacity={0.85}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* My Applications */}
          <Text style={[styles.sectionTitle, { color: c.foreground, marginTop: 24, marginBottom: 12 }]}>
            My Applications
          </Text>

          {isLoading ? (
            <ActivityIndicator color={GREEN} />
          ) : applications.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.border }]}>
              <Feather name="file-text" size={32} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                No applications yet
              </Text>
            </View>
          ) : (
            applications.map((app) => (
              <View key={app.id} style={[styles.appCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.appCardTop}>
                  <View style={styles.appCardLeft}>
                    <Text style={[styles.appAmount, { color: c.foreground }]}>
                      ₹{app.amount.toLocaleString("en-IN")}
                    </Text>
                    <Text style={[styles.appPurpose, { color: c.mutedForeground }]}>
                      {app.purpose} · {app.duration} months
                    </Text>
                  </View>
                  <StatusBadge status={app.status} />
                </View>

                {app.message ? (
                  <Text style={[styles.appMessage, { color: c.mutedForeground, borderTopColor: c.border }]}>
                    "{app.message}"
                  </Text>
                ) : null}

                {app.reviewNote ? (
                  <View style={[styles.reviewNote, { backgroundColor: app.status === "approved" ? "#D1FAE518" : "#FEE2E218", borderColor: app.status === "approved" ? "#6EE7B740" : "#FCA5A540" }]}>
                    <Feather name="message-circle" size={12} color={app.status === "approved" ? "#065F46" : "#991B1B"} />
                    <Text style={[styles.reviewNoteText, { color: app.status === "approved" ? "#065F46" : "#991B1B" }]}>
                      Admin: {app.reviewNote}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.appDate, { color: c.mutedForeground }]}>
                  Submitted {new Date(app.submittedAt).toLocaleDateString("en-IN")}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 },
  successBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  successText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  textareaRow: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  textarea: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 72, textAlignVertical: "top" },
  purposeDropdown: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  purposeItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  purposeText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  calcBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  calcTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  calcGrid: { flexDirection: "row", justifyContent: "space-between" },
  calcItem: { alignItems: "center", flex: 1 },
  calcLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  calcValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  submitBtn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 15,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyBox: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  appCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  appCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  appCardLeft: { flex: 1 },
  appAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  appPurpose: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  appMessage: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingTop: 10, borderTopWidth: 1, lineHeight: 18 },
  reviewNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  reviewNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  appDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
