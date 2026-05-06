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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Green header */}
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <SafeAreaView edges={["top"]} style={styles.headerContent}>
            {!sent && (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.iconCircle}>
              <Feather name={sent ? "check-circle" : "lock"} size={28} color={GREEN} />
            </View>
            <Text style={styles.heading}>{sent ? "Email Sent!" : "Forgot Password"}</Text>
            <Text style={styles.subheading}>
              {sent
                ? "Check your inbox for the reset link"
                : "Enter your registered email to reset your password"}
            </Text>
          </SafeAreaView>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>

          {!sent ? (
            <>
              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
                </View>
              ) : null}

              <View style={[styles.infoBox, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <Feather name="info" size={14} color={GREEN} />
                <Text style={[styles.infoText, { color: GREEN }]}>
                  We'll send a password reset link to your email. Click the link to set a new password.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Email Address</Text>
                <View style={[styles.inputWrapper, {
                  borderColor: error ? "#EF4444" : c.border,
                  backgroundColor: c.muted,
                }]}>
                  <Feather name="mail" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Enter your registered email"
                    placeholderTextColor={c.mutedForeground}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  {email.length > 0 && /\S+@\S+\.\S+/.test(email) && (
                    <Feather name="check-circle" size={16} color={GREEN} />
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, (loading || !email.trim()) && { opacity: 0.65 }]}
                onPress={handleReset}
                disabled={loading || !email.trim()}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={17} color="#fff" />
                    <Text style={styles.actionBtnText}>Send Reset Link</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                <Feather name="arrow-left" size={14} color={GREEN} />
                <Text style={[styles.backLinkText, { color: GREEN }]}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Success state */}
              <View style={styles.successBlock}>
                <View style={[styles.successIcon, { backgroundColor: GREEN + "18" }]}>
                  <Feather name="mail" size={44} color={GREEN} />
                </View>
                <Text style={[styles.successTitle, { color: c.foreground }]}>Check your inbox</Text>
                <Text style={[styles.successDesc, { color: c.mutedForeground }]}>
                  A password reset link has been sent to{"\n"}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: c.foreground }}>{email}</Text>
                </Text>
                <View style={[styles.noteBox, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                  <Feather name="info" size={13} color={GREEN} />
                  <Text style={[styles.noteText, { color: GREEN }]}>
                    Click the link in the email to set your new password. Check spam/junk if you don't see it.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
              >
                <Feather name="log-in" size={17} color="#fff" />
                <Text style={styles.actionBtnText}>Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setSent(false); setEmail(""); setError(""); }}
                style={styles.backLink}
              >
                <Feather name="refresh-cw" size={14} color={c.mutedForeground} />
                <Text style={[styles.backLinkText, { color: c.mutedForeground }]}>Resend to a different email</Text>
              </TouchableOpacity>
            </>
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
    backgroundColor: GREEN, paddingBottom: 60,
    minHeight: SCREEN_H * 0.36, justifyContent: "flex-end", overflow: "hidden",
  },
  circle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -50 },
  circle2: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.06)", top: 30, left: -40 },
  headerContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", marginBottom: 16, padding: 4 },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center" },
  formCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingTop: 32, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, backgroundColor: GREEN, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  backLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  backLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  successBlock: { alignItems: "center", gap: 14, paddingVertical: 8 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, width: "100%" },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
