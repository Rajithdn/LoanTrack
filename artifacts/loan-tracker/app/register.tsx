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
import { AntDesign } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { register, signOut, signInWithGoogle } from "@/services/authService";

const { height: SCREEN_H } = Dimensions.get("window");
const GREEN = "#00A86B";

export default function RegisterScreen() {
  const c = useColors();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validate = (): string | null => {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return "Enter a valid email address.";
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) return "Phone number must be exactly 10 digits.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleRegister = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await register(name.trim(), email.trim(), password, phone.trim());
      await signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess("Account created successfully. Please sign in.");
      setTimeout(() => {
        router.replace("/login");
      }, 4000);
    } catch (e: any) {
      setError(e?.message ?? "Registration failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const profile = await signInWithGoogle();
      setUser(profile);
      router.replace(profile.role === "admin" ? "/(admin)/dashboard" : "/(user)/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Google Sign-In failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleLoading(false);
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Feather name="user-plus" size={28} color={GREEN} />
            </View>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join LoanTracker as a borrower</Text>
          </SafeAreaView>
        </View>

        {/* White form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>
          {success ? (
            <View style={[styles.errorBox, { backgroundColor: "#00A86B18", borderColor: "#00A86B40" }]}>
              <Feather name="check-circle" size={14} color="#00A86B" />
              <Text style={[styles.errorText, { color: "#00A86B" }]}>{success}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E218", borderColor: "#EF444440" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
            </View>
          ) : null}

          {/* Google Sign-Up */}
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={handleGoogleRegister}
            disabled={googleLoading || loading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={GREEN} />
            ) : (
              <>
                <AntDesign name="google" size={20} color="#EA4335" />
                <Text style={[styles.googleBtnText, { color: c.foreground }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.mutedForeground }]}>or sign up with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Full Name</Text>
            <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
              <Feather name="user" size={16} color={c.mutedForeground} />
              <TextInput
                style={[styles.input, { color: c.foreground }]}
                placeholder="Enter your full name"
                placeholderTextColor={c.mutedForeground}
                value={name}
                onChangeText={(v) => { setName(v); setError(""); }}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
              <Feather name="mail" size={16} color={c.mutedForeground} />
              <TextInput
                style={[styles.input, { color: c.foreground }]}
                placeholder="Enter your email"
                placeholderTextColor={c.mutedForeground}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Phone Number (optional)</Text>
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
              />
              {phone.length === 10 && <Feather name="check-circle" size={16} color={GREEN} />}
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Password</Text>
            <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
              <Feather name="lock" size={16} color={c.mutedForeground} />
              <TextInput
                style={[styles.input, { color: c.foreground }]}
                placeholder="Min 6 characters"
                placeholderTextColor={c.mutedForeground}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                secureTextEntry={!showPass}
                autoCorrect={false}
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
            style={[styles.registerBtn, (loading || googleLoading) && { opacity: 0.75 }]}
            onPress={handleRegister}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="user-check" size={17} color="#fff" />
                <Text style={styles.registerBtnText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: c.mutedForeground }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={[styles.loginLink, { color: GREEN }]}>Sign In</Text>
            </TouchableOpacity>
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
    minHeight: SCREEN_H * 0.34, justifyContent: "flex-end", overflow: "hidden",
  },
  circle1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)", top: -50, right: -50 },
  circle2: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.06)", top: 30, left: -40 },
  headerContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 16 },
  backBtn: { alignSelf: "flex-start", marginBottom: 16, padding: 4 },
  logoCircle: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
  },
  heading: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  formCard: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingTop: 32, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  googleBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  phonePrefix: { paddingRight: 8, borderRightWidth: 1, marginRight: 2 },
  prefixText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  registerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, backgroundColor: GREEN, marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  registerBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  loginRow: { flexDirection: "row", justifyContent: "center", paddingBottom: 8 },
  loginText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loginLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
