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
import { getUserByEmail } from "@/services/userService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";
type Step = "email" | "verify" | "password" | "done";

export default function ForgotPasswordScreen() {
  const c = useColors();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [mockCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [enteredCode, setEnteredCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const user = await getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        setError("No account found with this email address.");
        return;
      }
      setStep("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (enteredCode.trim() !== mockCode) {
      setError("Incorrect code. Please check and try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("password");
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await resetPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
    } catch (e: any) {
      setError(e?.message ?? "Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "email") router.back();
    else if (step === "verify") { setStep("email"); setError(""); }
    else if (step === "password") { setStep("verify"); setError(""); }
  };

  const stepIcons: Record<Step, any> = { email: "mail", verify: "shield", password: "lock", done: "check-circle" };
  const stepTitles: Record<Step, string> = { email: "Forgot Password", verify: "Verify Identity", password: "Set New Password", done: "All Done!" };
  const stepSubs: Record<Step, string> = {
    email: "Enter your registered email to begin",
    verify: "Enter the verification code shown below",
    password: "Choose a strong new password",
    done: "Your reset request has been submitted",
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>

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
                {(["email", "verify", "password"] as Step[]).map((s, i) => {
                  const order: Step[] = ["email", "verify", "password"];
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

          {/* STEP 1: Email */}
          {step === "email" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Email Address</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
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
                </View>
              </View>
              <TouchableOpacity style={[styles.actionBtn, loading && { opacity: 0.75 }]} onPress={handleEmailSubmit} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><Feather name="arrow-right" size={17} color="#fff" /><Text style={styles.actionBtnText}>Continue</Text></>)}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={styles.cancelRow}>
                <Text style={[styles.cancelText, { color: c.mutedForeground }]}>Remember your password? </Text>
                <Text style={[styles.cancelLink, { color: GREEN }]}>Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: Verify code */}
          {step === "verify" && (
            <>
              <View style={[styles.codeDisplay, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <View style={[styles.codeIconBox, { backgroundColor: GREEN + "20" }]}>
                  <Feather name="message-square" size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.codeLabel, { color: c.mutedForeground }]}>Your verification code</Text>
                  <Text style={[styles.codeValue, { color: GREEN }]}>{mockCode}</Text>
                </View>
                <View style={[styles.codeBadge, { backgroundColor: GREEN }]}>
                  <Text style={styles.codeBadgeText}>IN-APP</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Enter Verification Code</Text>
                <View style={[styles.inputWrapper, { borderColor: enteredCode.length === 6 ? GREEN : c.border, backgroundColor: c.muted }]}>
                  <Feather name="hash" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground, letterSpacing: 5, fontSize: 20, fontFamily: "Inter_700Bold" }]}
                    placeholder="••••••"
                    placeholderTextColor={c.mutedForeground}
                    value={enteredCode}
                    onChangeText={(v) => { setEnteredCode(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  {enteredCode.length === 6 && <Feather name="check-circle" size={16} color={GREEN} />}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, enteredCode.length < 6 && { opacity: 0.55 }]}
                onPress={handleVerifyCode}
                disabled={enteredCode.length < 6}
                activeOpacity={0.85}
              >
                <Feather name="shield" size={17} color="#fff" />
                <Text style={styles.actionBtnText}>Verify Code</Text>
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
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Feather name={showPass ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
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
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Feather name={showConfirm ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
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
                <Text style={[styles.successTitle, { color: c.foreground }]}>Request Submitted!</Text>
                <Text style={[styles.successDesc, { color: c.mutedForeground }]}>
                  A secure reset link has been sent to{"\n"}
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
                  {"\n\n"}Open the link in your email to activate your new password.
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
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  matchHint: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  codeDisplay: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  codeIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  codeLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
  codeValue: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 6 },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  codeBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
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
