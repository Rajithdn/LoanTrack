import React, { useState, useRef, useEffect } from "react";
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
import { register, signOut } from "@/services/authService";
import {
  verifyOTP,
  verifyStoredOTP,
  getPendingUser,
  clearPendingUser,
  getOtpMode,
  getLoginPhone,
} from "@/services/otpService";
import { getUserByPhone } from "@/services/userService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";
const OTP_LENGTH = 6;

export default function OTPScreen() {
  const c = useColors();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = getOtpMode();
  const pending = getPendingUser();
  const loginPhone = getLoginPhone();
  const isMock = mode === "mock_register" || mode === "mock_forgot";

  const displayPhone = mode === "login"
    ? (loginPhone ? `+91 XXXXX${loginPhone.slice(-4)}` : "+91 XXXXXXXXXX")
    : (pending?.phone ? `+91 XXXXX${pending.phone.slice(-4)}` : null);

  useEffect(() => {
    if (isMock) return; // no countdown for Firestore OTP
    timerRef.current = setInterval(() => {
      setResendCooldown((v) => {
        if (v <= 1) { clearInterval(timerRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleChange = (text: string, idx: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError("");
    if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = "";
      setOtp(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH).fill("");
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setError(`Please enter all ${OTP_LENGTH} digits.`); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (mode === "mock_register") {
        // Verify OTP stored in Firestore (keyed by email)
        if (!pending) { setError("Session expired. Please register again."); setLoading(false); return; }
        await verifyStoredOTP(pending.email, code);
        await register(pending.name, pending.email, pending.password, pending.phone);
        await signOut();
        clearPendingUser();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSuccess("Account created! Redirecting to sign in…");
        setTimeout(() => router.replace("/login"), 1800);
        return;
      }

      // Firebase phone OTP flow (login)
      await verifyOTP(code);
      if (mode === "login") {
        const profile = await getUserByPhone(loginPhone);
        if (!profile) { setError("No account found with this phone number. Please register first."); setLoading(false); return; }
        clearPendingUser();
        router.replace(profile.role === "admin" ? "/(admin)/dashboard" : "/(user)/dashboard");
      } else {
        if (!pending) { setError("Session expired. Please register again."); setLoading(false); return; }
        await register(pending.name, pending.email, pending.password, pending.phone);
        clearPendingUser();
        await signOut();
        setSuccess("Account created! Redirecting to sign in…");
        setTimeout(() => router.replace("/login"), 1800);
      }
    } catch (e: any) {
      setError(e?.message ?? "Verification failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Feather name="smartphone" size={28} color={GREEN} />
            </View>
            <Text style={styles.heading}>
              {mode === "login" ? "Verify to Sign In" : "Verify Account"}
            </Text>
            <Text style={styles.subheading}>
              {isMock
                ? "A 6-digit OTP has been sent to your registered contact"
                : "Enter the 6-digit OTP sent to"}
            </Text>
            {!isMock && displayPhone && (
              <Text style={styles.phoneDisplay}>{displayPhone}</Text>
            )}
          </SafeAreaView>
        </View>

        {/* OTP Form */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>

          {/* Info banner for mock/Firestore OTP */}
          {isMock && (
            <View style={[styles.infoBanner, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
              <Feather name="shield" size={14} color={GREEN} />
              <Text style={[styles.infoText, { color: GREEN }]}>
                Check your registered contact for the verification code. Enter it below to proceed.
              </Text>
            </View>
          )}

          {success ? (
            <View style={[styles.successBox, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
              <Feather name="check-circle" size={16} color={GREEN} />
              <Text style={[styles.successText, { color: GREEN }]}>{success}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
            </View>
          ) : null}

          <Text style={[styles.otpLabel, { color: c.mutedForeground }]}>Enter Verification Code</Text>

          {/* 6 OTP boxes */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.otpBox,
                  {
                    borderColor: otp[i] ? GREEN : c.border,
                    backgroundColor: otp[i] ? GREEN + "10" : c.muted,
                    color: c.foreground,
                  },
                ]}
                value={otp[i]}
                onChangeText={(t) => {
                  if (t.length > 1) { handlePaste(t); return; }
                  handleChange(t, i);
                }}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={i === 0}
                editable={!success}
              />
            ))}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, (loading || !!success) && { opacity: 0.75 }]}
            onPress={handleVerify}
            disabled={loading || !!success}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.verifyBtnText}>
                  {mode === "login" ? "Verify & Sign In" : "Verify & Create Account"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resend (only for real Firebase OTP) */}
          {!isMock && (
            <View style={styles.resendRow}>
              {resendCooldown > 0 ? (
                <Text style={[styles.resendInfo, { color: c.mutedForeground }]}>
                  Resend OTP in <Text style={{ color: GREEN, fontFamily: "Inter_700Bold" }}>{resendCooldown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={[styles.resendLink, { color: GREEN }]}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Go back link for mock */}
          {isMock && (
            <TouchableOpacity onPress={() => router.back()} style={styles.resendRow}>
              <Text style={[styles.resendLink, { color: c.mutedForeground }]}>← Go back and try again</Text>
            </TouchableOpacity>
          )}

          {/* Security note */}
          <View style={[styles.secureNote, { backgroundColor: c.muted }]}>
            <Feather name="lock" size={13} color={c.mutedForeground} />
            <Text style={[styles.secureNoteText, { color: c.mutedForeground }]}>
              Your verification code expires in 10 minutes. Never share it with anyone.
            </Text>
          </View>
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
    minHeight: SCREEN_H * 0.38, justifyContent: "flex-end", overflow: "hidden",
  },
  circle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -50 },
  circle2: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.06)", top: 30, left: -40 },
  headerContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", marginBottom: 20, padding: 4 },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 6 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", textAlign: "center" },
  phoneDisplay: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 4 },
  formCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingTop: 32, gap: 18 },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  successText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  otpLabel: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  otpBox: { width: 48, height: 58, borderRadius: 14, borderWidth: 2, fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  verifyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, backgroundColor: GREEN, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  verifyBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  resendRow: { alignItems: "center" },
  resendInfo: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  secureNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10 },
  secureNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
