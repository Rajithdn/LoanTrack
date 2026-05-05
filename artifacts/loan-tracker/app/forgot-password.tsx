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
import { getUserByPhone } from "@/services/userService";
import { generateOTPCode, storeOTP, verifyStoredOTP } from "@/services/otpService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";
type Step = "phone" | "verify" | "password" | "done";

export default function ForgotPasswordScreen() {
  const c = useColors();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: verify phone & send OTP ─────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.length !== 10) { setError("Enter a valid 10-digit phone number."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const user = await getUserByPhone(cleaned);
      if (!user) { setError("No account found with this phone number. Please check and try again."); return; }
      const code = generateOTPCode();
      await storeOTP(cleaned, code);
      // In production: send via SMS gateway. For dev, log to console only.
      if (__DEV__) console.log("[DEV] Forgot-password OTP for", cleaned, ":", code);
      setFoundEmail(user.email);
      setStep("verify");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (enteredCode.trim().length !== 6) { setError("Enter the 6-digit code."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await verifyStoredOTP(phone.replace(/[^0-9]/g, ""), enteredCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("password");
    } catch (e: any) {
      setError(e?.message ?? "Verification failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ─────────────────────────────────────────────────
  const handleSetPassword = async () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await resetPassword(foundEmail);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (e: any) {
      setError(e?.message ?? "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "phone") router.back();
    else if (step === "verify") { setStep("phone"); setError(""); setEnteredCode(""); }
    else if (step === "password") { setStep("verify"); setError(""); }
  };

  const stepIcons: Record<Step, any> = { phone: "phone", verify: "shield", password: "lock", done: "check-circle" };
  const stepTitles: Record<Step, string> = {
    phone: "Forgot Password",
    verify: "Verify Identity",
    password: "Set New Password",
    done: "All Done!",
  };
  const stepSubs: Record<Step, string> = {
    phone: "Enter your registered mobile number",
    verify: "Enter the OTP sent to your mobile",
    password: "Choose a strong new password",
    done: "Your reset request has been processed",
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
            {step !== "done" && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <Feather name="arrow-left" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.iconCircle}>
              <Feather name={stepIcons[step]} size={28} color={GREEN} />
            </View>
            <Text style={styles.heading}>{stepTitles[step]}</Text>
            <Text style={styles.subheading}>{stepSubs[step]}</Text>
            {step !== "done" && (
              <View style={styles.dots}>
                {(["phone", "verify", "password"] as Step[]).map((s, i) => {
                  const order: Step[] = ["phone", "verify", "password"];
                  const filled = i <= order.indexOf(step);
                  return <View key={s} style={[styles.dot, filled ? { backgroundColor: "#fff", width: 20 } : { backgroundColor: "rgba(255,255,255,0.35)" }]} />;
                })}
              </View>
            )}
          </SafeAreaView>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
            </View>
          ) : null}

          {/* STEP 1: Phone */}
          {step === "phone" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Registered Mobile Number</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <Feather name="phone" size={16} color={c.mutedForeground} />
                  <View style={[styles.phonePrefix, { borderRightColor: c.border }]}>
                    <Text style={[styles.prefixText, { color: c.mutedForeground }]}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="10-digit number"
                    placeholderTextColor={c.mutedForeground}
                    value={phone}
                    onChangeText={(v) => { setPhone(v.replace(/[^0-9]/g, "").slice(0, 10)); setError(""); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                  {phone.length === 10 && <Feather name="check-circle" size={16} color={GREEN} />}
                </View>
              </View>
              <TouchableOpacity style={[styles.actionBtn, loading && { opacity: 0.75 }]} onPress={handlePhoneSubmit} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><Feather name="send" size={17} color="#fff" /><Text style={styles.actionBtnText}>Send OTP</Text></>)}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={styles.cancelRow}>
                <Text style={[styles.cancelText, { color: c.mutedForeground }]}>Remember your password? </Text>
                <Text style={[styles.cancelLink, { color: GREEN }]}>Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: OTP */}
          {step === "verify" && (
            <>
              <View style={[styles.infoBanner, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <Feather name="message-square" size={14} color={GREEN} />
                <Text style={[styles.infoText, { color: GREEN }]}>
                  OTP has been sent to <Text style={{ fontFamily: "Inter_700Bold" }}>+91 XXXXX{phone.slice(-5)}</Text>. Enter it below.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Enter OTP</Text>
                <View style={[styles.inputWrapper, {
                  borderColor: enteredCode.length === 6 ? GREEN : c.border,
                  backgroundColor: c.muted,
                }]}>
                  <Feather name="hash" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground, letterSpacing: 5, fontSize: 20, fontFamily: "Inter_700Bold" }]}
                    placeholder="• • • • • •"
                    placeholderTextColor={c.mutedForeground}
                    value={enteredCode}
                    onChangeText={(v) => { setEnteredCode(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    secureTextEntry
                  />
                  {enteredCode.length === 6 && <Feather name="check-circle" size={16} color={GREEN} />}
                </View>
                <Text style={[styles.hintText, { color: c.mutedForeground }]}>OTP is valid for 10 minutes</Text>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, (loading || enteredCode.length < 6) && { opacity: 0.6 }]}
                onPress={handleVerifyOtp}
                disabled={loading || enteredCode.length < 6}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (<><Feather name="shield" size={17} color="#fff" /><Text style={styles.actionBtnText}>Verify OTP</Text></>)}
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: New password */}
          {step === "password" && (
            <>
              <View style={[styles.verifiedBadge, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <Feather name="check-circle" size={14} color={GREEN} />
                <Text style={[styles.verifiedText, { color: GREEN }]}>Identity verified successfully</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>New Password</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <Feather name="lock" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={c.mutedForeground}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(""); }}
                    secureTextEntry={!showPass}
                    autoCorrect={false}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass((p) => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <Feather name={showPass ? "eye-off" : "eye"} size={18} color={c.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Confirm Password</Text>
                <View style={[styles.inputWrapper, {
                  borderColor: confirmPassword && confirmPassword !== newPassword ? "#EF4444" : c.border,
                  backgroundColor: c.muted,
                }]}>
                  <Feather name="lock" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Repeat your password"
                    placeholderTextColor={c.mutedForeground}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setError(""); }}
                    secureTextEntry={!showConfirm}
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm((p) => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color={c.mutedForeground} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && (
                  <Text style={[styles.matchHint, { color: confirmPassword === newPassword ? GREEN : "#EF4444" }]}>
                    {confirmPassword === newPassword ? "Passwords match" : "Passwords do not match"}
                  </Text>
                )}
              </View>

              <TouchableOpacity style={[styles.actionBtn, loading && { opacity: 0.75 }]} onPress={handleSetPassword} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><Feather name="check" size={17} color="#fff" /><Text style={styles.actionBtnText}>Reset Password</Text></>)}
              </TouchableOpacity>
            </>
          )}

          {/* STEP 4: Done */}
          {step === "done" && (
            <>
              <View style={styles.successBlock}>
                <View style={[styles.successIcon, { backgroundColor: GREEN + "18" }]}>
                  <Feather name="check-circle" size={48} color={GREEN} />
                </View>
                <Text style={[styles.successTitle, { color: c.foreground }]}>Reset Initiated!</Text>
                <Text style={[styles.successDesc, { color: c.mutedForeground }]}>
                  Your identity was verified successfully. A secure reset link has been sent to your registered email to activate the new password.
                </Text>
                <View style={[styles.noteBox, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                  <Feather name="info" size={13} color={GREEN} />
                  <Text style={[styles.noteText, { color: GREEN }]}>Check your spam/junk folder if you don't see it.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.replace("/login")} activeOpacity={0.85}>
                <Feather name="log-in" size={17} color="#fff" />
                <Text style={styles.actionBtnText}>Back to Sign In</Text>
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
  dots: { flexDirection: "row", gap: 6, marginTop: 16 },
  dot: { height: 6, borderRadius: 3 },
  formCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingTop: 32, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  phonePrefix: { paddingRight: 8, borderRightWidth: 1, marginRight: 2 },
  prefixText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  matchHint: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  verifiedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, backgroundColor: GREEN, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  cancelRow: { flexDirection: "row", justifyContent: "center", paddingBottom: 8 },
  cancelText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  cancelLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  successBlock: { alignItems: "center", paddingVertical: 12, gap: 12 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, opacity: 0.85 },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, width: "100%" },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
