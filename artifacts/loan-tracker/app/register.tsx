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
import { register } from "@/services/authService";

export default function RegisterScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const profile = await register(name.trim(), email.trim(), password);
      setUser(profile);
      router.replace("/(user)/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Registration failed. Please try again.");
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
          { paddingTop: topPad + 32, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>

        <Text style={[styles.heading, { color: c.foreground }]}>Create Account</Text>
        <Text style={[styles.subheading, { color: c.mutedForeground }]}>
          Register as a borrower to track your loan
        </Text>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.destructive + "18", borderColor: c.destructive + "40" }]}>
              <Feather name="alert-circle" size={14} color={c.destructive} />
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Full Name</Text>
            <View style={[styles.inputWrapper, { borderColor: c.border, backgroundColor: c.muted }]}>
              <Feather name="user" size={16} color={c.mutedForeground} />
              <TextInput
                style={[styles.input, { color: c.foreground }]}
                placeholder="Enter your full name"
                placeholderTextColor={c.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
                placeholder="Min 6 characters"
                placeholderTextColor={c.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={c.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: c.primary }, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: c.mutedForeground }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={[styles.loginLink, { color: c.primary }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 24 },
  back: { marginBottom: 24 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subheading: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 28 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 16 },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  registerBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  registerBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loginLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
