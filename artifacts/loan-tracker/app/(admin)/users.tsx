import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getAllUsers, addUser, updateUser, deleteUser } from "@/services/userService";
import { getLoansByUser } from "@/services/loanService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/services/authService";
import type { Loan } from "@/services/loanService";
import { ScreenHeader } from "@/components/ScreenHeader";

const GREEN = "#00A86B";

function BorrowerDetailModal({
  user,
  visible,
  onClose,
  colors,
}: {
  user: UserProfile | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["loans", user?.id],
    queryFn: () => getLoansByUser(user!.id),
    enabled: !!user,
  });

  if (!user) return null;

  const activeLoans = loans.filter((l) => l.status === "active");
  const completedLoans = loans.filter((l) => l.status === "completed");
  const totalBorrowed = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paidAmount, 0);
  const totalPending = loans.reduce((s, l) => s + l.pendingAmount, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[detailStyles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[detailStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[detailStyles.headerTitle, { color: colors.foreground }]}>Borrower Details</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={detailStyles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <View style={[detailStyles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[detailStyles.avatar, { backgroundColor: GREEN + "20" }]}>
              <Text style={[detailStyles.avatarText, { color: GREEN }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[detailStyles.userName, { color: colors.foreground }]}>{user.name}</Text>
            <View style={detailStyles.infoRow}>
              <Feather name="mail" size={13} color={colors.mutedForeground} />
              <Text style={[detailStyles.infoText, { color: colors.mutedForeground }]}>{user.email}</Text>
            </View>
            {user.phone ? (
              <View style={detailStyles.infoRow}>
                <Feather name="phone" size={13} color={colors.mutedForeground} />
                <Text style={[detailStyles.infoText, { color: colors.mutedForeground }]}>+91 {user.phone}</Text>
              </View>
            ) : null}
            <View style={[detailStyles.roleBadge, { backgroundColor: GREEN + "15" }]}>
              <Text style={[detailStyles.roleText, { color: GREEN }]}>Borrower</Text>
            </View>
          </View>

          {/* Summary stats */}
          <View style={detailStyles.statsGrid}>
            <View style={[detailStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: colors.foreground }]}>{loans.length}</Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>Total Loans</Text>
            </View>
            <View style={[detailStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: GREEN }]}>{activeLoans.length}</Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
            </View>
            <View style={[detailStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: "#6366f1" }]}>{completedLoans.length}</Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>Completed</Text>
            </View>
          </View>

          {/* Financial summary */}
          <View style={[detailStyles.financeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[detailStyles.sectionTitle, { color: colors.foreground }]}>Financial Summary</Text>
            <View style={detailStyles.financeRow}>
              <Text style={[detailStyles.financeLabel, { color: colors.mutedForeground }]}>Total Borrowed</Text>
              <Text style={[detailStyles.financeValue, { color: colors.foreground }]}>₹{totalBorrowed.toLocaleString()}</Text>
            </View>
            <View style={[detailStyles.divider, { backgroundColor: colors.border }]} />
            <View style={detailStyles.financeRow}>
              <Text style={[detailStyles.financeLabel, { color: colors.mutedForeground }]}>Total Paid</Text>
              <Text style={[detailStyles.financeValue, { color: GREEN }]}>₹{totalPaid.toLocaleString()}</Text>
            </View>
            <View style={[detailStyles.divider, { backgroundColor: colors.border }]} />
            <View style={detailStyles.financeRow}>
              <Text style={[detailStyles.financeLabel, { color: colors.mutedForeground }]}>Pending Amount</Text>
              <Text style={[detailStyles.financeValue, { color: "#ef4444" }]}>₹{totalPending.toLocaleString()}</Text>
            </View>
          </View>

          {/* Loans list */}
          <Text style={[detailStyles.sectionTitle, { color: colors.foreground, marginHorizontal: 0, marginBottom: 10 }]}>
            Loans
          </Text>

          {isLoading ? (
            <ActivityIndicator color={GREEN} style={{ marginTop: 20 }} />
          ) : loans.length === 0 ? (
            <View style={[detailStyles.emptyLoans, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="credit-card" size={32} color={colors.mutedForeground} />
              <Text style={[detailStyles.emptyText, { color: colors.mutedForeground }]}>No loans yet</Text>
            </View>
          ) : (
            loans.map((loan) => (
              <View key={loan.id} style={[detailStyles.loanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={detailStyles.loanHeader}>
                  <View style={detailStyles.loanAmountRow}>
                    <Text style={[detailStyles.loanAmount, { color: colors.foreground }]}>
                      ₹{loan.amount.toLocaleString()}
                    </Text>
                    <View style={[
                      detailStyles.statusBadge,
                      { backgroundColor: loan.status === "active" ? GREEN + "15" : "#6366f115" }
                    ]}>
                      <Text style={[
                        detailStyles.statusText,
                        { color: loan.status === "active" ? GREEN : "#6366f1" }
                      ]}>
                        {loan.status === "active" ? "Active" : "Completed"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[detailStyles.loanMeta, { color: colors.mutedForeground }]}>
                    {loan.interest}% • {loan.duration} months • EMI ₹{loan.emi.toLocaleString()}
                  </Text>
                </View>
                <View style={[detailStyles.divider, { backgroundColor: colors.border }]} />
                <View style={detailStyles.loanStatsRow}>
                  <View style={detailStyles.loanStat}>
                    <Text style={[detailStyles.loanStatVal, { color: GREEN }]}>₹{loan.paidAmount.toLocaleString()}</Text>
                    <Text style={[detailStyles.loanStatLabel, { color: colors.mutedForeground }]}>Paid</Text>
                  </View>
                  <View style={[detailStyles.vertDivider, { backgroundColor: colors.border }]} />
                  <View style={detailStyles.loanStat}>
                    <Text style={[detailStyles.loanStatVal, { color: "#ef4444" }]}>₹{loan.pendingAmount.toLocaleString()}</Text>
                    <Text style={[detailStyles.loanStatLabel, { color: colors.mutedForeground }]}>Pending</Text>
                  </View>
                  <View style={[detailStyles.vertDivider, { backgroundColor: colors.border }]} />
                  <View style={detailStyles.loanStat}>
                    <Text style={[detailStyles.loanStatVal, { color: colors.foreground }]}>₹{loan.totalAmount.toLocaleString()}</Text>
                    <Text style={[detailStyles.loanStatLabel, { color: colors.mutedForeground }]}>Total</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={[detailStyles.progressBg, { backgroundColor: colors.muted }]}>
                  <View style={[
                    detailStyles.progressFill,
                    { width: `${Math.min(100, (loan.paidAmount / loan.totalAmount) * 100)}%` as any, backgroundColor: GREEN }
                  ]} />
                </View>
                <Text style={[detailStyles.progressText, { color: colors.mutedForeground }]}>
                  {Math.round((loan.paidAmount / loan.totalAmount) * 100)}% repaid
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function UsersScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [formError, setFormError] = useState("");

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });

  const addMutation = useMutation({
    mutationFn: ({ name, email, pass, phone }: any) => addUser(name, email, pass, phone),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); },
    onError: (e: any) => setFormError(e?.message?.includes("email-already") ? "Email already in use" : "Failed to add user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); closeModal(); },
    onError: () => setFormError("Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const checkAndDelete = async (u: UserProfile) => {
    try {
      const loans = await getLoansByUser(u.id);
      const activeLoans = loans.filter((l) => l.status === "active");
      if (activeLoans.length > 0) {
        Alert.alert(
          "Cannot Delete Borrower",
          `${u.name} has ${activeLoans.length} active loan${activeLoans.length > 1 ? "s" : ""}. Please close all active loans before deleting this borrower.`,
          [{ text: "OK" }]
        );
        return;
      }
      Alert.alert(
        "Delete Borrower",
        loans.length > 0
          ? `${u.name} has completed loans on record. Are you sure you want to remove this borrower?`
          : `Remove ${u.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(u.id) },
        ]
      );
    } catch {
      Alert.alert("Error", "Could not verify loan records. Please try again.");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditUser(null);
    setForm({ name: "", email: "", phone: "", password: "" });
    setFormError("");
    setModalVisible(true);
  };
  const openEdit = (u: UserProfile) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, phone: u.phone ?? "", password: "" });
    setFormError("");
    setModalVisible(true);
  };
  const openDetail = (u: UserProfile) => {
    setDetailUser(u);
    setDetailVisible(true);
  };
  const closeModal = () => setModalVisible(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError("Name and email are required"); return; }
    if (form.phone && !/^\d{10}$/.test(form.phone.trim())) { setFormError("Phone must be 10 digits"); return; }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, data: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() } });
    } else {
      if (!form.password || form.password.length < 6) { setFormError("Password must be 6+ characters"); return; }
      addMutation.mutate({ name: form.name.trim(), email: form.email.trim(), pass: form.password, phone: form.phone.trim() });
    }
  };

  const handleDelete = (u: UserProfile) => {
    checkAndDelete(u);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: GREEN }]}>
      <ScreenHeader
        title="Borrowers"
        subtitle={`${users.length} total`}
        right={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]} onPress={openAdd}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.body, { backgroundColor: c.background }]}>
        <View style={[styles.searchRow, { paddingHorizontal: 20 }]}>
          <View style={[styles.searchBox, { backgroundColor: c.muted, borderColor: c.border }]}>
            <Feather name="search" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: c.foreground }]}
              placeholder="Search by name or email..."
              placeholderTextColor={c.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={c.mutedForeground} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
            scrollEnabled
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="users" size={40} color={c.mutedForeground} />
                <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No borrowers found</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.userCard, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => openDetail(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: c.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: c.primary }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: c.foreground }]}>{item.name}</Text>
                  <Text style={[styles.userEmail, { color: c.mutedForeground }]}>{item.email}</Text>
                  {item.phone ? (
                    <View style={styles.phoneRow}>
                      <Feather name="phone" size={11} color={c.mutedForeground} />
                      <Text style={[styles.phoneText, { color: c.mutedForeground }]}>+91 {item.phone}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={[styles.actionBtn, { backgroundColor: c.muted }]}>
                    <Feather name="edit-2" size={15} color={c.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, { backgroundColor: c.destructive + "15" }]}>
                    <Feather name="trash-2" size={15} color={c.destructive} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Borrower Detail Modal */}
      <BorrowerDetailModal
        user={detailUser}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={c}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>{editUser ? "Edit Borrower" : "Add Borrower"}</Text>
            <TouchableOpacity onPress={closeModal}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {formError ? (
              <View style={[styles.errorBox, { backgroundColor: c.destructive + "15", borderColor: c.destructive + "40" }]}>
                <Feather name="alert-circle" size={14} color={c.destructive} />
                <Text style={[styles.formError, { color: c.destructive }]}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Feather name="user" size={16} color={c.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  placeholder="Enter full name"
                  placeholderTextColor={c.mutedForeground}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Email</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Feather name="mail" size={16} color={c.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  placeholder="Enter email address"
                  placeholderTextColor={c.mutedForeground}
                  value={form.email}
                  onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Phone (optional)</Text>
              <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                <Feather name="phone" size={16} color={c.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: c.foreground }]}
                  placeholder="10-digit number"
                  placeholderTextColor={c.mutedForeground}
                  value={form.phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone: v.replace(/[^0-9]/g, "").slice(0, 10) }))}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {!editUser && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Password</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <Feather name="lock" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={c.mutedForeground}
                    value={form.password}
                    onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                    secureTextEntry
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: c.primary }]}
              onPress={handleSave}
              disabled={addMutation.isPending || updateMutation.isPending}
              activeOpacity={0.85}
            >
              {addMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editUser ? "Save Changes" : "Add Borrower"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, overflow: "hidden" },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchRow: { paddingVertical: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  userCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  phoneText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 24, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  formError: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

const detailStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  closeBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  profileCard: {
    alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1, gap: 8,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  financeCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  financeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  financeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  financeValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, borderRadius: 1 },
  vertDivider: { width: 1, height: 30, borderRadius: 1 },
  emptyLoans: {
    alignItems: "center", padding: 32, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loanCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12, gap: 12 },
  loanHeader: { gap: 4 },
  loanAmountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loanAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loanMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  loanStatsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  loanStat: { alignItems: "center", gap: 2 },
  loanStatVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  loanStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
});
