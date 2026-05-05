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
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getAllLoans, addLoan, calculateEMI, calculateLoanBreakdown } from "@/services/loanService";
import { getAllUsers } from "@/services/userService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/services/authService";
import { LoanCard } from "@/components/LoanCard";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function LoansScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [form, setForm] = useState({ amount: "", interest: "", duration: "" });
  const [formError, setFormError] = useState("");

  const { data: loans = [], isLoading } = useQuery({ queryKey: ["loans"], queryFn: getAllLoans });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });

  const addMutation = useMutation({
    mutationFn: ({ userId, userName, amount, interest, duration }: any) =>
      addLoan(userId, userName, amount, interest, duration),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["loans"] }); setModalVisible(false); setForm({ amount: "", interest: "", duration: "" }); setSelectedUser(null); },
    onError: () => setFormError("Failed to add loan. Try again."),
  });

  const filtered = loans.filter((l) => filter === "all" || l.status === filter);

  const breakdown = form.amount && form.interest && form.duration
    ? calculateLoanBreakdown(parseFloat(form.amount), parseFloat(form.interest), parseInt(form.duration))
    : null;
  const emi = breakdown?.emi ?? null;
  const total = breakdown?.totalAmount ?? null;
  const interestAmt = breakdown?.interestAmount ?? null;

  const handleAdd = async () => {
    if (!selectedUser) { setFormError("Select a borrower"); return; }
    if (!form.amount || !form.interest || !form.duration) { setFormError("Fill all fields"); return; }
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) { setFormError("Invalid amount"); return; }
    setFormError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMutation.mutate({
      userId: selectedUser.id,
      userName: selectedUser.name,
      amount: parseFloat(form.amount),
      interest: parseFloat(form.interest),
      duration: parseInt(form.duration),
    });
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: "#00A86B" }]}>
      <ScreenHeader
        title="Loans"
        subtitle={`${loans.length} total`}
        right={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]} onPress={() => setModalVisible(true)}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.body, { backgroundColor: c.background }]}>
      {/* Filters */}
      <View style={[styles.filterRow, { paddingHorizontal: 20 }]}>
        {(["all", "active", "completed"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && { backgroundColor: c.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : c.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="briefcase" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No loans found</Text>
            </View>
          }
          renderItem={({ item }) => <LoanCard loan={item} userName={item.userName} />}
        />
      )}

      </View>{/* end body */}

      {/* Add Loan Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <ScrollView style={[styles.modalContent, { backgroundColor: c.background }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Add Loan</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {formError ? <Text style={[styles.formError, { color: c.destructive }]}>{formError}</Text> : null}

            {/* Borrower Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Borrower</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, { borderColor: c.border, backgroundColor: c.muted }]}
                onPress={() => setUserPickerVisible(true)}
              >
                <Feather name="user" size={16} color={c.mutedForeground} />
                <Text style={[styles.pickerText, { color: selectedUser ? c.foreground : c.mutedForeground }]}>
                  {selectedUser ? selectedUser.name : "Select borrower..."}
                </Text>
                <Feather name="chevron-down" size={16} color={c.mutedForeground} />
              </TouchableOpacity>
            </View>

            {([
              { label: "Loan Amount (₹)", key: "amount", placeholder: "e.g. 50000", dec: true },
              { label: "Annual Interest Rate (%)", key: "interest", placeholder: "e.g. 12", dec: true },
              { label: "Duration (months)", key: "duration", placeholder: "e.g. 24", dec: false },
            ] as const).map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{field.label}</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={c.mutedForeground}
                    value={form[field.key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                    keyboardType={field.dec ? "decimal-pad" : "number-pad"}
                  />
                </View>
              </View>
            ))}

            {emi && total && (
              <View style={[styles.calcBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
                <Text style={[styles.calcTitle, { color: c.primary }]}>EMI Calculation</Text>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Monthly EMI</Text>
                  <Text style={[styles.calcValue, { color: c.foreground }]}>₹{emi.toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Total Payable</Text>
                  <Text style={[styles.calcValue, { color: c.foreground }]}>₹{total.toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: c.mutedForeground }]}>Interest Amount</Text>
                  <Text style={[styles.calcValue, { color: c.warning }]}>
                    ₹{interestAmt?.toLocaleString() ?? "0"}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.primary }]}
              onPress={handleAdd}
              disabled={addMutation.isPending}
              activeOpacity={0.85}
            >
              {addMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Loan</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* User Picker Modal */}
      <Modal visible={userPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setUserPickerVisible(false)}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Select Borrower</Text>
            <TouchableOpacity onPress={() => setUserPickerVisible(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.userPickItem, { borderColor: c.border, backgroundColor: selectedUser?.id === item.id ? c.primary + "18" : c.card }]}
                onPress={() => { setSelectedUser(item); setUserPickerVisible(false); }}
              >
                <View style={[styles.avatarSm, { backgroundColor: c.primary + "20" }]}>
                  <Text style={[styles.avatarSmText, { color: c.primary }]}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.userName, { color: c.foreground }]}>{item.name}</Text>
                  <Text style={[styles.userEmail, { color: c.mutedForeground }]}>{item.email}</Text>
                </View>
                {selectedUser?.id === item.id && <Feather name="check" size={18} color={c.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: "hidden" },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 24, gap: 16 },
  formError: { fontFamily: "Inter_500Medium", fontSize: 13 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  pickerBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  inputWrapper: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular" },
  calcBox: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 10 },
  calcTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 4 },
  calcRow: { flexDirection: "row", justifyContent: "space-between" },
  calcLabel: { fontFamily: "Inter_400Regular", fontSize: 13 },
  calcValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  userPickItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  avatarSm: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarSmText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
