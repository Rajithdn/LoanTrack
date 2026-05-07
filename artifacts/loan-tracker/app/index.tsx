import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const c = useColors();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("onboarding_done")
      .then((val) => {
        setOnboardingDone(val === "1");
      })
      .catch(() => {
        // If AsyncStorage fails (e.g. iframe/deployed environment), treat onboarding as done
        // so the user reaches the login screen rather than being stuck on a spinner.
        setOnboardingDone(true);
      })
      .finally(() => {
        setCheckingOnboarding(false);
      });
  }, []);

  useEffect(() => {
    if (loading || checkingOnboarding) return;

    if (!onboardingDone) {
      router.replace("/onboarding");
      return;
    }

    if (!user) {
      router.replace("/login");
    } else if (user.role === "admin") {
      router.replace("/(admin)/dashboard");
    } else {
      router.replace("/(user)/dashboard");
    }
  }, [user, loading, checkingOnboarding, onboardingDone]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
