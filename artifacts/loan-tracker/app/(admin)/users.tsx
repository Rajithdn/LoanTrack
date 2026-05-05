import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "@/services/authService";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function UsersScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
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
    Alert.alert("Delete Borrower", `Remove ${u.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(u.id) },
    ]);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: "#00A86B" }]}>
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
            <View style={[styles.userCard, { backgroundColor: c.card, borderColor: c.border }]}>
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
            </View>
          )}
        />
      )}

      </View>{/* end body */}

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
