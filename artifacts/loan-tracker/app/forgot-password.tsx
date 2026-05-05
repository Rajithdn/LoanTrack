import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { resetPassword } from "@/services/authService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";

export default function ForgotPasswordScreen() {
  const c = useColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await resetPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send reset email. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Green header */}
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <SafeAreaView edges={["top"]} style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Feather name="lock" size={28} color={GREEN} />
            </View>
            <Text style={styles.heading}>Reset Password</Text>
            <Text style={styles.subheading}>We'll send a reset link to your email</Text>
          </SafeAreaView>
        </View>

        {/* White form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>
          {!sent ? (
            <>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>Forgot Password?</Text>
              <Text style={[styles.cardSub, { color: c.mutedForeground }]}>
                Enter your registered email address and we'll send you a link to reset your password.
              </Text>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Email Address</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <Feather name="mail" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Enter your email"
                    placeholderTextColor={c.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.resetBtn, loading && { opacity: 0.75 }]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={17} color="#fff" />
                    <Text style={styles.resetBtnText}>Send Reset Link</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} style={styles.backToLogin}>
                <Feather name="arrow-left" size={14} color={GREEN} />
                <Text style={[styles.backToLoginText, { color: GREEN }]}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: GREEN + "18" }]}>
                <Feather name="check-circle" size={44} color={GREEN} />
              </View>
              <Text style={[styles.successTitle, { color: c.foreground }]}>Email Sent!</Text>
              <Text style={[styles.successMsg, { color: c.mutedForeground }]}>
                A password reset link has been sent to{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold", color: c.foreground }}>{email}</Text>.
                {"\n\n"}Check your inbox and follow the link to reset your password.
              </Text>
              <View style={[styles.noteBox, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <Feather name="info" size={14} color={GREEN} />
                <Text style={[styles.noteText, { color: GREEN }]}>
                  If you don't see the email, check your spam/junk folder.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
              >
                <Feather name="log-in" size={17} color="#fff" />
                <Text style={styles.resetBtnText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: GREEN },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: GREEN,
    paddingBottom: 60,
    minHeight: SCREEN_H * 0.34,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -50,
  },
  circle2: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)", top: 30, left: -40,
  },
  headerContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", marginBottom: 16, padding: 4 },
  logoCircle: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  formCard: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingTop: 32, gap: 16,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: -6 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  resetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16,
    backgroundColor: GREEN, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  resetBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  backToLogin: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  backToLoginText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  successContainer: { alignItems: "center", gap: 16, paddingTop: 12 },
  successIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successMsg: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  noteBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, width: "100%",
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
