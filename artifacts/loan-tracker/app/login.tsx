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
import { useAuth } from "@/context/AuthContext";
import { signIn } from "@/services/authService";
import { sendPhoneOTP, setOtpMode, setLoginPhone } from "@/services/otpService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";

export default function LoginScreen() {
  const c = useColors();
  const { setUser } = useAuth();
  const [tab, setTab] = useState<"email" | "otp">("email");

  // Email login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP login
  const [phone, setPhone] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const profile = await signIn(email.trim(), password);
      setUser(profile);
      if (profile.role === "admin") {
        router.replace("/(admin)/dashboard");
      } else {
        router.replace("/(user)/dashboard");
      }
    } catch (e: any) {
      setError(e?.message ?? "Login failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(phone.trim())) {
      setOtpError("Please enter a valid 10-digit phone number.");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setOtpMode("login");
      setLoginPhone(phone.trim());
      await sendPhoneOTP(phone.trim());
      router.push("/otp");
    } catch (e: any) {
      setOtpError(e?.message ?? "Failed to send OTP. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setOtpLoading(false);
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
          <View style={styles.circle3} />
          <SafeAreaView edges={["top"]} style={styles.headerContent}>
            <View style={styles.logoCircle}>
              <Feather name="trending-up" size={30} color={GREEN} />
            </View>
            <Text style={styles.appName}>LoanTracker</Text>
            <Text style={styles.tagline}>Smart loan management for everyone</Text>
          </SafeAreaView>
        </View>

        {/* Form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>
          <Text style={[styles.heading, { color: c.foreground }]}>Welcome Back</Text>
          <Text style={[styles.subheading, { color: c.mutedForeground }]}>
            Sign in to your account
          </Text>

          {/* Tab switcher */}
          <View style={[styles.tabRow, { backgroundColor: c.muted, borderColor: c.border }]}>
            <TouchableOpacity
              style={[styles.tab, tab === "email" && { backgroundColor: GREEN }]}
              onPress={() => { setTab("email"); setError(""); setOtpError(""); }}
              activeOpacity={0.8}
            >
              <Feather name="mail" size={14} color={tab === "email" ? "#fff" : c.mutedForeground} />
              <Text style={[styles.tabText, { color: tab === "email" ? "#fff" : c.mutedForeground }]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "otp" && { backgroundColor: GREEN }]}
              onPress={() => { setTab("otp"); setError(""); setOtpError(""); }}
              activeOpacity={0.8}
            >
              <Feather name="smartphone" size={14} color={tab === "otp" ? "#fff" : c.mutedForeground} />
              <Text style={[styles.tabText, { color: tab === "otp" ? "#fff" : c.mutedForeground }]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email tab */}
          {tab === "email" && (
            <>
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

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Password</Text>
                <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
                  <Feather name="lock" size={16} color={c.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: c.foreground }]}
                    placeholder="Enter your password"
                    placeholderTextColor={c.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
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

              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.75 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotBtn}
                activeOpacity={0.7}
              >
                <Feather name="help-circle" size={14} color={GREEN} />
                <Text style={[styles.forgotText, { color: GREEN }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* OTP tab */}
          {tab === "otp" && (
            <>
              {otpError ? (
                <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.errorText, { color: "#EF4444" }]}>{otpError}</Text>
                    {otpError.includes("not enabled") && (
                      <Text style={[styles.errorText, { color: "#EF4444", fontSize: 11, opacity: 0.85 }]}>
                        To fix: Go to Firebase Console → Authentication → Sign-in method → Enable "Phone"
                      </Text>
                    )}
                  </View>
                </View>
              ) : null}

              <View style={[styles.otpInfo, { backgroundColor: GREEN + "12", borderColor: GREEN + "30" }]}>
                <Feather name="info" size={14} color={GREEN} />
                <Text style={[styles.otpInfoText, { color: GREEN }]}>
                  Enter your registered phone number. An OTP will be sent to verify your identity.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Phone Number</Text>
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
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, "").slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  {phone.length === 10 && (
                    <Feather name="check-circle" size={16} color={GREEN} />
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, otpLoading && { opacity: 0.75 }]}
                onPress={handleSendOTP}
                disabled={otpLoading}
                activeOpacity={0.85}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.loginBtnText}>Send OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          {/* Register */}
          <TouchableOpacity
            style={[styles.registerBtn, { borderColor: GREEN }]}
            onPress={() => router.push("/register")}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={16} color={GREEN} />
            <Text style={[styles.registerBtnText, { color: GREEN }]}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Feather name="shield" size={12} color={GREEN + "99"} />
          <Text style={[styles.footerText, { color: GREEN + "99" }]}>
            Secured with Firebase Authentication
          </Text>
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
    minHeight: SCREEN_H * 0.36,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)", top: -60, right: -60,
  },
  circle2: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)", top: 40, left: -50,
  },
  circle3: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.1)", bottom: 40, right: 30,
  },
  headerContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 },
  logoCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  appName: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 6 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.82)", textAlign: "center" },
  formCard: {
    flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingTop: 32, gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 10,
  },
  heading: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  tabRow: {
    flexDirection: "row", borderRadius: 12, padding: 4, borderWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  otpInfo: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  otpInfoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  phonePrefix: { paddingRight: 8, borderRightWidth: 1, marginRight: 2 },
  prefixText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: "center",
    backgroundColor: GREEN, flexDirection: "row", justifyContent: "center", gap: 8,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6, marginTop: 4,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  forgotBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  forgotText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  registerBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, flexDirection: "row", justifyContent: "center", gap: 8,
  },
  registerBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 24, backgroundColor: "#fff",
  },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
