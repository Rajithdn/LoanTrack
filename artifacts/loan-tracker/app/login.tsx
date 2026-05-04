import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { signIn } from "@/services/authService";

export default function LoginScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: topPad + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={[styles.logoBox, { backgroundColor: c.primary }]}>
            <Feather name="trending-up" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: c.foreground }]}>LoanTracker</Text>
          <Text style={[styles.tagline, { color: c.mutedForeground }]}>Manage loans with clarity</Text>
        </View>

        {/* Admin hint */}
        <View style={[styles.hintBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
          <Feather name="info" size={14} color={c.primary} />
          <View style={styles.hintText}>
            <Text style={[styles.hintTitle, { color: c.foreground }]}>Admin credentials</Text>
            <Text style={[styles.hintSub, { color: c.mutedForeground }]}>admin@gmail.com · Admin@07</Text>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.heading, { color: c.foreground }]}>Welcome back</Text>
          <Text style={[styles.subheading, { color: c.mutedForeground }]}>Sign in to your account</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.destructive + "18", borderColor: c.destructive + "40" }]}>
              <Feather name="alert-circle" size={14} color={c.destructive} />
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
            <Feather name="mail" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              placeholder="Email address"
              placeholderTextColor={c.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
            <Feather name="lock" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              placeholder="Password"
              placeholderTextColor={c.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]}
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
        </View>

        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: c.mutedForeground }]}>New borrower? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={[styles.registerLink, { color: c.primary }]}>Create account</Text>
          </TouchableOpacity>
        </View>

        {/* Firebase setup note */}
        <View style={[styles.setupNote, { backgroundColor: c.muted, borderColor: c.border }]}>
          <Feather name="settings" size={12} color={c.mutedForeground} />
          <Text style={[styles.setupText, { color: c.mutedForeground }]}>
            Firebase setup required: Enable Email/Password auth and set Firestore rules to allow authenticated access.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 20 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    shadowColor: "#1A56DB", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16,
  },
  hintText: { flex: 1 },
  hintTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  hintSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 16 },
  heading: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 24, marginBottom: 16 },
  registerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  registerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  setupNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  setupText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
