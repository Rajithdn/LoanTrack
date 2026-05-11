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
import { getAllLoans, addLoan, calculateLoanBreakdown } from "@/services/loanService";
import { getAllUsers } from "@/services/userService";
import { getAllApplications, reviewApplication, type LoanApplication } from "@/services/loanApplicationService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/services/authService";
import { LoanCard } from "@/components/LoanCard";
import { ScreenHeader } from "@/components/ScreenHeader";

const GREEN = "#00A86B";

export default function LoansScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  // Tab: "loans" | "applications"
  const [tab, setTab] = useState<"loans" | "applications">("loans");

  // Loan form state
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [userFilterPickerVisible, setUserFilterPickerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPickerVisible, setUserPickerVisible] = useState(false);
  const [form, setForm] = useState({ amount: "", interest: "", duration: "" });
  const [formError, setFormError] = useState("");

  // Application review state
  const [reviewModal, setReviewModal] = useState<LoanApplication | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [appFilter, setAppFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: loans = [], isLoading } = useQuery({ queryKey: ["loans"], queryFn: getAllLoans });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });
  const { data: applications = [], isLoading: appsLoading } = useQuery({ queryKey: ["applications"], queryFn: getAllApplications });

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const addMutation = useMutation({
    mutationFn: ({ userId, userName, amount, interest, duration }: any) =>
      addLoan(userId, userName, amount, interest, duration),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      setModalVisible(false);
      setForm({ amount: "", interest: "", duration: "" });
      setSelectedUser(null);
    },
    onError: () => setFormError("Failed to add loan. Try again."),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "approved" | "rejected"; note: string }) =>
      reviewApplication(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      setReviewModal(null);
      setReviewNote("");
    },
  });

  const filtered = loans.filter((l) => {
    const statusMatch = filter === "all" || l.status === filter;
    const userMatch = userFilter === "all" || l.userId === userFilter;
    return statusMatch && userMatch;
  });

  const filteredApps = applications.filter((a) =>
    appFilter === "all" ? true : a.status === appFilter
  );

  const selectedUserName =
    userFilter === "all" ? "All Users" : (users.find((u) => u.id === userFilter)?.name ?? "Unknown");

  const breakdown =
    form.amount && form.interest && form.duration
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
    <View style={[styles.flex, { backgroundColor: GREEN }]}>
      <ScreenHeader
        title="Loans"
        subtitle={`${loans.length} total`}
        right={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={[styles.body, { backgroundColor: c.background }]}>
        {/* Main Tab Switch */}
        <View style={[styles.mainTabRow, { borderBottomColor: c.border }]}>
          <TouchableOpacity
            style={[styles.mainTab, tab === "loans" && { borderBottomColor: GREEN, borderBottomWidth: 2 }]}
            onPress={() => setTab("loans")}
          >
            <Text style={[styles.mainTabText, { color: tab === "loans" ? GREEN : c.mutedForeground }]}>
              Loans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, tab === "applications" && { borderBottomColor: GREEN, borderBottomWidth: 2 }]}
            onPress={() => setTab("applications")}
          >
            <View style={styles.mainTabInner}>
              <Text style={[styles.mainTabText, { color: tab === "applications" ? GREEN : c.mutedForeground }]}>
                Applications
              </Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── LOANS TAB ── */}
        {tab === "loans" && (
          <>
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

            <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
              <TouchableOpacity
                style={[styles.userFilterBtn, { borderColor: c.border, backgroundColor: c.muted }]}
                onPress={() => setUserFilterPickerVisible(true)}
              >
                <Feather name="user" size={14} color={c.mutedForeground} />
                <Text style={[styles.userFilterText, { color: userFilter === "all" ? c.mutedForeground : c.foreground }]} numberOfLines={1}>
                  {selectedUserName}
                </Text>
                <Feather name="chevron-down" size={14} color={c.mutedForeground} />
              </TouchableOpacity>
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
                renderItem={({ item }) => {
                  const start = new Date(item.startDate);
                  const now = new Date();
                  const monthsElapsed = Math.floor((now.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
                  const expectedPaid = Math.min(Math.max(monthsElapsed, 0), item.duration) * item.emi;
                  const isOverdue = item.status === "active" && monthsElapsed > 0 && item.paidAmount < expectedPaid - 1;
                  return <LoanCard loan={item} userName={item.userName} isOverdue={isOverdue} />;
                }}
              />
            )}
          </>
        )}

        {/* ── APPLICATIONS TAB ── */}
        {tab === "applications" && (
          <>
            <View style={[styles.filterRow, { paddingHorizontal: 20 }]}>
              {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, appFilter === f && { backgroundColor: c.primary }]}
                  onPress={() => setAppFilter(f)}
                >
                  <Text style={[styles.filterText, { color: appFilter === f ? "#fff" : c.mutedForeground }]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {appsLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
            ) : (
              <FlatList
                data={filteredApps}
                keyExtractor={(a) => a.id}
                contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 90 }}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Feather name="file-text" size={40} color={c.mutedForeground} />
                    <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No applications</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.appCard, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={() => { setReviewModal(item); setReviewNote(item.reviewNote ?? ""); }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.appCardTop}>
                      <View style={styles.appCardLeft}>
                        <Text style={[styles.appName, { color: c.foreground }]}>{item.userName}</Text>
                        <Text style={[styles.appEmail, { color: c.mutedForeground }]}>{item.userEmail}</Text>
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor:
                          item.status === "pending" ? "#FFF3CD" :
                          item.status === "approved" ? "#D1FAE5" : "#FEE2E2"
                      }]}>
                        <Text style={[styles.statusText, {
                          color:
                            item.status === "pending" ? "#856404" :
                            item.status === "approved" ? "#065F46" : "#991B1B"
                        }]}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.appDetails}>
                      <View style={styles.appDetailItem}>
                        <Text style={[styles.appDetailLabel, { color: c.mutedForeground }]}>Amount</Text>
                        <Text style={[styles.appDetailValue, { color: c.foreground }]}>
                          ₹{item.amount.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      <View style={styles.appDetailItem}>
                        <Text style={[styles.appDetailLabel, { color: c.mutedForeground }]}>Duration</Text>
                        <Text style={[styles.appDetailValue, { color: c.foreground }]}>{item.duration} mo</Text>
                      </View>
                      <View style={styles.appDetailItem}>
                        <Text style={[styles.appDetailLabel, { color: c.mutedForeground }]}>Purpose</Text>
                        <Text style={[styles.appDetailValue, { color: c.foreground }]}>{item.purpose}</Text>
                      </View>
                    </View>

                    {item.message ? (
                      <Text style={[styles.appMessage, { color: c.mutedForeground, borderTopColor: c.border }]}>
                        "{item.message}"
                      </Text>
                    ) : null}

                    <View style={styles.appFooter}>
                      <Text style={[styles.appDate, { color: c.mutedForeground }]}>
                        {new Date(item.submittedAt).toLocaleDateString("en-IN")}
                      </Text>
                      {item.status === "pending" && (
                        <Text style={[styles.tapReview, { color: GREEN }]}>Tap to review →</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}
      </View>

      {/* ── Add Loan Modal ── */}
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
                  <Text style={[styles.calcValue, { color: "#F59E0B" }]}>₹{interestAmt?.toLocaleString() ?? "0"}</Text>
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

      {/* ── Review Application Modal ── */}
      <Modal visible={!!reviewModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewModal(null)}>
        {reviewModal && (
          <ScrollView style={[styles.modalContent, { backgroundColor: c.background }]} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Review Application</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <Feather name="x" size={22} color={c.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={[styles.reviewInfo, { backgroundColor: c.muted, borderColor: c.border }]}>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Applicant</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>{reviewModal.userName}</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Email</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>{reviewModal.userEmail}</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Amount</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>₹{reviewModal.amount.toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Duration</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>{reviewModal.duration} months</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Purpose</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>{reviewModal.purpose}</Text>
                </View>
                <View style={styles.reviewInfoRow}>
                  <Text style={[styles.reviewInfoLabel, { color: c.mutedForeground }]}>Submitted</Text>
                  <Text style={[styles.reviewInfoValue, { color: c.foreground }]}>{new Date(reviewModal.submittedAt).toLocaleDateString("en-IN")}</Text>
                </View>
              </View>

              {reviewModal.message ? (
                <View style={[styles.messageBox, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[styles.messageLabel, { color: c.mutedForeground }]}>Applicant's Message</Text>
                  <Text style={[styles.messageText, { color: c.foreground }]}>"{reviewModal.message}"</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Review Note (shown to user)</Text>
                <View style={[styles.textareaWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <TextInput
                    style={[styles.textarea, { color: c.foreground }]}
                    placeholder="Add a note for the applicant..."
                    placeholderTextColor={c.mutedForeground}
                    value={reviewNote}
                    onChangeText={setReviewNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {reviewModal.status === "pending" ? (
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: "#EF4444" }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      reviewMutation.mutate({ id: reviewModal.id, status: "rejected", note: reviewNote });
                    }}
                    disabled={reviewMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {reviewMutation.isPending ? <ActivityIndicator color="#EF4444" size="small" /> : (
                      <>
                        <Feather name="x-circle" size={16} color="#EF4444" />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: GREEN }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      reviewMutation.mutate({ id: reviewModal.id, status: "approved", note: reviewNote });
                    }}
                    disabled={reviewMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {reviewMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Feather name="check-circle" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.alreadyReviewed, {
                  backgroundColor: reviewModal.status === "approved" ? "#D1FAE518" : "#FEE2E218",
                  borderColor: reviewModal.status === "approved" ? "#6EE7B750" : "#FCA5A550",
                }]}>
                  <Feather name={reviewModal.status === "approved" ? "check-circle" : "x-circle"} size={16} color={reviewModal.status === "approved" ? "#065F46" : "#991B1B"} />
                  <Text style={[styles.alreadyReviewedText, { color: reviewModal.status === "approved" ? "#065F46" : "#991B1B" }]}>
                    This application was {reviewModal.status}.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>

      {/* ── User Filter Picker ── */}
      <Modal visible={userFilterPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setUserFilterPickerVisible(false)}>
        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Filter by Borrower</Text>
            <TouchableOpacity onPress={() => setUserFilterPickerVisible(false)}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: "all", name: "All Users", email: "" } as any, ...users]}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.userPickItem, { borderColor: c.border, backgroundColor: userFilter === item.id ? c.primary + "18" : c.card }]}
                onPress={() => { setUserFilter(item.id); setUserFilterPickerVisible(false); }}
              >
                <View style={[styles.avatarSm, { backgroundColor: c.primary + "20" }]}>
                  <Text style={[styles.avatarSmText, { color: c.primary }]}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.userName, { color: c.foreground }]}>{item.name}</Text>
                  {item.email ? <Text style={[styles.userEmail, { color: c.mutedForeground }]}>{item.email}</Text> : null}
                </View>
                {userFilter === item.id && <Feather name="check" size={18} color={c.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ── User Picker for Add Loan ── */}
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

  mainTabRow: { flexDirection: "row", borderBottomWidth: 1 },
  mainTab: { flex: 1, alignItems: "center", paddingVertical: 13 },
  mainTabInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  mainTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { backgroundColor: "#F59E0B", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  filterRow: { flexDirection: "row", gap: 8, paddingVertical: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  userFilterBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  userFilterText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },

  appCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  appCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  appCardLeft: { flex: 1 },
  appName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  appEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  appDetails: { flexDirection: "row", justifyContent: "space-between" },
  appDetailItem: { alignItems: "center", flex: 1 },
  appDetailLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  appDetailValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  appMessage: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingTop: 8, borderTopWidth: 1, lineHeight: 17 },
  appFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tapReview: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

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

  reviewInfo: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  reviewInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewInfoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  reviewInfoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1, textAlign: "right" },
  messageBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  messageLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  messageText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 18 },
  textareaWrapper: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  textarea: { fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 72, textAlignVertical: "top" },
  reviewActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  rejectBtnText: { color: "#EF4444", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  approveBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  approveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  alreadyReviewed: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  alreadyReviewedText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  userPickItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  avatarSm: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarSmText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  userEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
